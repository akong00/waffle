'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchGist, hasUserPosted, parsePostsFromGist, cleanupOldPosts } from '@/lib/gist';
import { getCurrentWeekKey, getWeekLabel, isWithinTwoWeeks } from '@/lib/week';
import TextPostForm from '@/components/TextPostForm';
import VoiceRecorder from '@/components/VoiceRecorder';
import PostFeed from '@/components/PostFeed';

export default function MainScreen({ gistId, gistToken, username }) {
    const [weekKey] = useState(getCurrentWeekKey());
    const [weekLabel] = useState(getWeekLabel(getCurrentWeekKey()));
    const [gistData, setGistData] = useState(null);
    const [userHasPosted, setUserHasPosted] = useState(false);
    const [posts, setPosts] = useState([]);
    const [participatedWeeks, setParticipatedWeeks] = useState(new Set());
    const [postMode, setPostMode] = useState('text'); // text or voice
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async (forcePosted = false) => {
        try {
            setError('');
            const data = await fetchGist(gistId, gistToken);
            setGistData(data);

            // 1. Fetch ALL posts (no weekKey filter)
            const allPosts = parsePostsFromGist(data);
            setPosts(allPosts);

            // 2. Identify which weeks the user has posted in
            const userWeeks = new Set(
                allPosts
                    .filter(p => p.author === username)
                    .map(p => p.weekKey)
            );
            setParticipatedWeeks(userWeeks);

            // 3. Update current week status
            const postedThisWeek = userWeeks.has(weekKey) || forcePosted;
            setUserHasPosted(postedThisWeek);

            // 4. Determine participation
            // We'll pass the set of unlocked weeks to the feed
            // (Store this in state or derive it)

        } catch (err) {
            setError('Failed to load posts. Please check your connection.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [gistId, gistToken, weekKey, username]);

    useEffect(() => {
        loadData();
        // Cleanup old posts still works based on date arithmetic in week.js
        cleanupOldPosts(gistId, gistToken, isWithinTwoWeeks).catch(() => { });
    }, [loadData, gistId, gistToken]);

    const handlePostCreated = async () => {
        // Immediately hide the post form so the user can't double-post
        setUserHasPosted(true);
        setLoading(true);
        // Give GitHub API a moment to propagate the write
        await new Promise(r => setTimeout(r, 1500));
        await loadData(true); // forcePosted=true prevents resetting the flag
    };



    return (
        <div className="main-screen">
            <header className="main-header">
                <div className="header-left">
                    <span className="logo-icon small">🧇</span>
                    <h1>Waffle Wednesday</h1>
                </div>
                <div className="header-right">
                    <span className="user-badge">{username}</span>
                </div>
            </header>

            <div className="week-banner">
                <span className="week-key">{weekKey}</span>
                <span className="week-label">{weekLabel}</span>
            </div>

            {error && <div className="error-banner">{error}</div>}

            {loading ? (
                <div className="loading-screen compact">
                    <div className="loading-spinner" />
                    <p>Loading posts...</p>
                </div>
            ) : (
                <>
                    {!userHasPosted ? (
                        <div className="post-section">
                            <div className="post-prompt">
                                <h2>Share something this week</h2>
                                <p>Post a message or voice recording to see what everyone else shared.</p>
                            </div>

                            <div className="post-mode-toggle">
                                <button
                                    className={`toggle-btn ${postMode === 'text' ? 'active' : ''}`}
                                    onClick={() => setPostMode('text')}
                                >
                                    ✏️ Text
                                </button>
                                <button
                                    className={`toggle-btn ${postMode === 'voice' ? 'active' : ''}`}
                                    onClick={() => setPostMode('voice')}
                                >
                                    🎙️ Voice
                                </button>
                            </div>

                            {postMode === 'text' ? (
                                <TextPostForm
                                    gistId={gistId}
                                    gistToken={gistToken}
                                    weekKey={weekKey}
                                    username={username}
                                    onPostCreated={handlePostCreated}
                                />
                            ) : (
                                <VoiceRecorder
                                    gistId={gistId}
                                    gistToken={gistToken}
                                    weekKey={weekKey}
                                    username={username}
                                    onPostCreated={handlePostCreated}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="post-section">
                            <div className="posted-badge">
                                <span>✅</span>
                                <span>You&apos;ve posted this week!</span>
                            </div>
                        </div>
                    )}

                    <div className="feed-section">
                        <h2 className="feed-title">Feed</h2>
                        <PostFeed
                            posts={posts}
                            username={username}
                            participatedWeeks={participatedWeeks}
                            currentWeekKey={weekKey}
                        />

                        {!userHasPosted && (
                            <div className="feed-locked-hint">
                                <p>🔒 Post something to unlock content</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
