'use client';

import { useState } from 'react';

export default function UsernameScreen({ onSubmit }) {
    const [firstName, setFirstName] = useState('');
    const [lastInitial, setLastInitial] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const first = firstName.trim();
        const last = lastInitial.trim().toUpperCase();

        if (!first) {
            setError('Please enter your first name.');
            return;
        }
        if (!last || last.length !== 1 || !/[A-Z]/.test(last)) {
            setError('Please enter a single letter for your last initial.');
            return;
        }

        onSubmit(`${first} ${last}`);
    };

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <div className="auth-logo">
                    <span className="logo-icon">🧇</span>
                    <h1>Welcome!</h1>
                    <p className="auth-subtitle">What should we call you?</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="firstName">First Name</label>
                        <input
                            id="firstName"
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Albert"
                            autoFocus
                            maxLength={20}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="lastInitial">Last Initial</label>
                        <input
                            id="lastInitial"
                            type="text"
                            value={lastInitial}
                            onChange={(e) => setLastInitial(e.target.value.slice(0, 1))}
                            placeholder="K"
                            maxLength={1}
                            className="initial-input"
                        />
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <button type="submit" className="btn-primary">
                        Continue
                    </button>
                </form>
            </div>
        </div>
    );
}
