'use client';

import { useState } from 'react';

export default function PasswordScreen({ onSubmit }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password.trim()) return;

        setLoading(true);
        setError('');

        const success = await onSubmit(password.trim());
        if (!success) {
            setError('Incorrect password. Please try again.');
        }
        setLoading(false);
    };

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="logo-icon">🧇</span>
                    <h1>Waffle</h1>
                    <p className="auth-subtitle">Weekly check-in with your crew</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="password">Enter Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Group password"
                            autoFocus
                            disabled={loading}
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? (
                            <span className="btn-loading">
                                <span className="loading-spinner small" />
                                Verifying...
                            </span>
                        ) : (
                            'Enter'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
