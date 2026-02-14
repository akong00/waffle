'use client';

import { useState } from 'react';
import { createTextPost } from '@/lib/gist';

export default function TextPostForm({ gistId, gistToken, weekKey, username, onPostCreated }) {
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return;

        setSubmitting(true);
        setError('');

        try {
            await createTextPost(gistId, gistToken, weekKey, username, content.trim());
            setContent('');
            onPostCreated();
        } catch (err) {
            setError('Failed to post. Please try again.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="text-post-form">
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind this week?"
                rows={4}
                maxLength={2000}
                disabled={submitting}
            />
            <div className="form-footer">
                <span className="char-count">{content.length}/2000</span>
                {error && <span className="error-message inline">{error}</span>}
                <button type="submit" className="btn-primary" disabled={!content.trim() || submitting}>
                    {submitting ? (
                        <span className="btn-loading">
                            <span className="loading-spinner small" />
                            Posting...
                        </span>
                    ) : (
                        'Post'
                    )}
                </button>
            </div>
        </form>
    );
}
