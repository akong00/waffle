'use client';

import { useMemo } from 'react';

export default function PostFeed({ posts, locked }) {
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

    if (post.type === 'text') {
        const content = locked ? 'This is a blurred message that contains enough text to look like a real post but is completely unreadable.' : post.content;
        return (
            <div className={`post-card text-post ${locked ? 'locked' : ''}`}>
                <p className={`post-content ${locked ? 'blurred' : ''}`}>{content}</p>
                <span className="post-time">{time}</span>
            </div>
        );
    }

    if (post.type === 'voice') {
        return <VoicePostCard post={post} time={time} locked={locked} />;
    }

    return null;
}

function VoicePostCard({ post, time, locked }) {
    const audioUrl = useMemo(() => {
        if (locked || !post._chunks || post._chunks.length === 0) return null;

        try {
            // Reassemble chunks
            const fullBase64 = post._chunks.join('');
            const binary = atob(fullBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: post.mimeType || 'audio/webm' });
            return URL.createObjectURL(blob);
        } catch {
            return null;
        }
    }, [post._chunks, post.mimeType, locked]);

    return (
        <div className={`post-card voice-post ${locked ? 'locked' : ''}`}>
            {locked ? (
                <div className="voice-placeholder blurred">
                    <span>🎙️ Audio recording hidden</span>
                </div>
            ) : audioUrl ? (
                <audio controls src={audioUrl} className="post-audio" />
            ) : (
                <p className="post-error">Audio unavailable</p>
            )}
            <span className="post-time">{time}</span>
        </div>
    );
}
