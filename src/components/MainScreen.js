'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchGist, hasUserPosted, parsePostsFromGist, cleanupOldPosts } from '@/lib/gist';
import { getCurrentWeekKey, getWeekLabel, isWithinTwoWeeks } from '@/lib/week';
import { clearCredentials } from '@/lib/auth';
import TextPostForm from '@/components/TextPostForm';
import VoiceRecorder from '@/components/VoiceRecorder';
import PostFeed from '@/components/PostFeed';

export default function MainScreen({ gistId, gistToken, username }) {
    const [weekKey] = useState(getCurrentWeekKey());
    const [weekLabel] = useState(getWeekLabel(getCurrentWeekKey()));
    const [gistData, setGistData] = useState(null);
    const [userHasPosted, setUserHasPosted] = useState(false);
    const [posts, setPosts] = useState([]);
    const [postMode, setPostMode] = useState('text'); // text or voice
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadData = useCallback(async () => {
        try {
            setError('');
            const data = await fetchGist(gistId, gistToken);
            setGistData(data);

            const posted = hasUserPosted(data, weekKey, username);
            setUserHasPosted(posted);

            if (posted) {
                const weekPosts = parsePostsFromGist(data, weekKey);
                setPosts(weekPosts);
            }
        } catch (err) {
            setError('Failed to load posts. Please check your connection.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [gistId, gistToken, weekKey, username]);

    useEffect(() => {
        loadData();

        // Cleanup old posts silently
        cleanupOldPosts(gistId, gistToken, isWithinTwoWeeks).catch(() => { });
    }, [loadData, gistId, gistToken]);

    const handlePostCreated = () => {
        setLoading(true);
        loadData();
    };

    const handleLogout = () => {
        clearCredentials();
        window.location.reload();
    };

    return (
        <div className="main-screen">
            <header className="main-header">
                <div className="header-left">
                    <span className="logo-icon small">🧇</span>
                    <h1>Waffle</h1>
                </div>
                <div className="header-right">
                    <span className="user-badge">{username}</span>
                    <button onClick={handleLogout} className="btn-ghost" title="Sign out">
                        ✕
                    </button>
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

                    {userHasPosted && (
                        <div className="feed-section">
                            <h2 className="feed-title">This Week&apos;s Posts</h2>
                            <PostFeed posts={posts} />
                        </div>
                    )}

                    {!userHasPosted && (
                        <div className="feed-locked">
                            <div className="lock-icon">🔒</div>
                            <p>Post something to unlock this week&apos;s feed</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
