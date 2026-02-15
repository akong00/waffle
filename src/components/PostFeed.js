'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { isPostedOnTime } from '@/lib/week';

export default function PostFeed({ posts, locked }) {
    // ... (rest of PostFeed logic remains the same)
    // Group posts by author
    const grouped = useMemo(() => {
        const map = {};
        for (const post of posts) {
            if (!map[post.author]) map[post.author] = [];
            map[post.author].push(post);
        }
        return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
    }, [posts]);

    if (posts.length === 0) {
        return (
            <div className="feed-empty">
                <p>No posts yet this week. Be the first!</p>
            </div>
        );
    }

    return (
        <div className="post-feed">
            {grouped.map(([author, authorPosts]) => (
                <div key={author} className="author-group">
                    <div className="author-header">
                        <div className="author-avatar">
                            {author.charAt(0).toUpperCase()}
                        </div>
                        <span className="author-name">{author}</span>
                    </div>
                    <div className="author-posts">
                        {authorPosts.map((post) => (
                            <PostCard key={post._filename} post={post} locked={locked} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function PostCard({ post, locked }) {
    const time = new Date(post.timestamp).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    // Check if posted on time (Wed 12:01 AM - Fri 11:59 PM CST)
    // We pass the weekKey from the post if available, or it might be inferred
    // Ideally post object has weekKey. If not, we might need a fallback or just check timestamp
    // The current week.js isPostedOnTime takes (timestamp, weekKey) but mostly relies on timestamp logic relative to week days
    const isLate = !isPostedOnTime(post.timestamp, post.weekKey || '');

    if (post.type === 'text') {
        const content = locked ? 'This is a blurred message that contains enough text to look like a real post but is completely unreadable.' : post.content;
        return (
            <div className={`post-card text-post ${locked ? 'locked' : ''}`}>
                <p className={`post-content ${locked ? 'blurred' : ''}`}>{content}</p>
                <div className="post-footer">
                    <span className="post-time">{time}</span>
                    {isLate && <span className="late-badge" title="Posted outside the Wed-Fri window">🔔 Late</span>}
                </div>
            </div>
        );
    }

    if (post.type === 'voice') {
        return <VoicePostCard post={post} time={time} locked={locked} isLate={isLate} />;
    }

    return null;
}


function VoicePostCard({ post, time, locked, isLate }) {
    const [audioUrl, setAudioUrl] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    // Custom Player State
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const audioRef = useRef(null);

    useEffect(() => {
        if (locked || !post._chunks || post._chunks.length === 0) {
            setAudioUrl(null);
            return;
        }

        let isMounted = true;

        async function assembleAudio() {
            setIsLoading(true);
            setIsError(false);
            try {
                // 1. Fetch any truncated chunks and decode them individually
                const decodedChunks = await Promise.all(
                    post._chunks.map(async (chunk) => {
                        let b64 = chunk.content;
                        if (chunk.truncated || !b64) {
                            const res = await fetch(chunk.raw_url);
                            if (!res.ok) throw new Error('Failed to fetch raw chunk');
                            b64 = await res.text();
                        }

                        // Decode individual chunk from Base64 to Uint8Array
                        const binary = atob(b64.trim());
                        const bytes = new Uint8Array(binary.length);
                        for (let i = 0; i < binary.length; i++) {
                            bytes[i] = binary.charCodeAt(i);
                        }
                        return bytes;
                    })
                );

                if (!isMounted) return;

                // 2. Create Blob from decoded chunks
                const blob = new Blob(decodedChunks, { type: post.mimeType || 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
            } catch (err) {
                console.error('Audio assembly failed:', err);
                if (isMounted) setIsError(true);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        assembleAudio();

        return () => {
            isMounted = false;
            // Note: We don't revoke URL here to avoid glitchy re-renders 
            // but in a production app we'd want to manage this carefully
        };
    }, [post._chunks, post.mimeType, locked]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            // setIsPlaying(!isPlaying); // State will be updated by onPlay/onPause events
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            // Constant check for duration if it's not yet settled
            if (duration === 0 || duration === Infinity) {
                const aud = audioRef.current;
                if (aud.duration !== Infinity && !isNaN(aud.duration) && aud.duration > 0) {
                    setDuration(aud.duration);
                }
            }
        }
    };

    const handleLoadedMetadata = (e) => {
        const audio = e.target;
        // Fix for WebM blobs missing duration
        if (audio.duration === Infinity) {
            audio.currentTime = 1e101;
            audio.ontimeupdate = function () {
                this.ontimeupdate = () => { };
                this.currentTime = 0;
                if (this.duration !== Infinity && !isNaN(this.duration)) {
                    setDuration(this.duration);
                }
            };
        } else {
            setDuration(audio.duration);
        }
    };

    const handleDurationChange = (e) => {
        const aud = e.target;
        if (aud.duration !== Infinity && !isNaN(aud.duration) && aud.duration > 0) {
            setDuration(aud.duration);
        }
    };

    const handleSeek = (e) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleSpeedChange = (rate) => {
        setPlaybackRate(rate);
        if (audioRef.current) {
            audioRef.current.playbackRate = rate;
            // Some browsers reset playbackRate on pause/play, 
            // but the element event handlers above should handle state
        }
    };

    const formatTime = (time) => {
        if (isNaN(time) || time === Infinity || time <= 0) {
            return '--:--';
        }
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`post-card voice-post ${locked ? 'locked' : ''}`}>
            {locked ? (
                <div className="voice-placeholder blurred">
                    <span>🎙️ Audio recording hidden</span>
                </div>
            ) : isLoading ? (
                <div className="voice-placeholder">
                    <span className="loading-spinner small"></span>
                    <span>Reassembling audio...</span>
                </div>
            ) : isError || !audioUrl ? (
                <p className="post-error">Audio unavailable</p>
            ) : (
                <div className="custom-audio-player">
                    <audio
                        ref={audioRef}
                        src={audioUrl}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onDurationChange={handleDurationChange}
                        onEnded={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />

                    <div className="player-main-controls">
                        {isLate && <span className="late-badge" title="Posted outside the Wed-Fri window">🔔 Late</span>}
                        <button className="play-toggle" onClick={togglePlay}>
                            {isPlaying ? '⏸' : '▶'}
                        </button>

                        <div className="progress-container">
                            <input
                                type="range"
                                className="progress-bar"
                                min="0"
                                max={duration || 0}
                                value={currentTime}
                                onChange={handleSeek}
                            />
                            <div className="time-display">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="playback-controls">
                        {[1, 1.5, 2, 2.5, 3].map((rate) => (
                            <button
                                key={rate}
                                className={`speed-btn ${playbackRate === rate ? 'active' : ''}`}
                                onClick={() => handleSpeedChange(rate)}
                            >
                                {rate}x
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <span className="post-time">{time}</span>
        </div>
    );
}
