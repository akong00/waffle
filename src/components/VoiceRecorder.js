'use client';

import { useState, useRef, useEffect } from 'react';
import { createVoicePost } from '@/lib/gist';
import { MAX_RECORDING_SECONDS } from '@/lib/config';

export default function VoiceRecorder({ gistId, gistToken, weekKey, username, onPostCreated }) {
    const [state, setState] = useState('idle'); // idle, recording, preview, submitting
    const [error, setError] = useState('');
    const [elapsed, setElapsed] = useState(0);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (timerRef.current) clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const startRecording = async () => {
        try {
            setError('');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : 'audio/webm',
            });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                setState('preview');

                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());
            };

            mediaRecorder.start(1000); // Collect data every second
            setState('recording');
            setElapsed(0);

            timerRef.current = setInterval(() => {
                setElapsed(prev => {
                    if (prev + 1 >= MAX_RECORDING_SECONDS) {
                        stopRecording();
                        return MAX_RECORDING_SECONDS;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            setError('Could not access microphone. Please allow microphone permissions.');
            console.error(err);
        }
    };

    const stopRecording = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
    };

    const discardRecording = () => {
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setElapsed(0);
        setState('idle');
    };

    const submitRecording = async () => {
        if (!audioBlob) return;

        setState('submitting');
        setError('');

        try {
            // Convert blob to Base64
            const buffer = await audioBlob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);
            const mimeType = audioBlob.type;

            await createVoicePost(gistId, gistToken, weekKey, username, base64, mimeType);
            discardRecording();
            onPostCreated();
        } catch (err) {
            setError('Failed to upload recording. Please try again.');
            setState('preview');
            console.error(err);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    return (
        <div className="voice-recorder">
            {state === 'idle' && (
                <div className="recorder-idle">
                    <button onClick={startRecording} className="record-btn" title="Start recording">
                        <span className="record-icon">🎙️</span>
                        <span>Tap to record</span>
                    </button>
                    <p className="recorder-hint">Up to {MAX_RECORDING_SECONDS / 60} minutes</p>
                </div>
            )}

            {state === 'recording' && (
                <div className="recorder-active">
                    <div className="recording-indicator">
                        <span className="pulse-dot" />
                        <span className="recording-label">Recording</span>
                    </div>
                    <div className="recording-timer">{formatTime(elapsed)}</div>
                    <div className="recording-limit">/ {formatTime(MAX_RECORDING_SECONDS)}</div>
                    <div className="recording-visualizer">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="viz-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                        ))}
                    </div>
                    <button onClick={stopRecording} className="stop-btn">
                        <span className="stop-icon" />
                        Stop
                    </button>
                </div>
            )}

            {state === 'preview' && (
                <div className="recorder-preview">
                    <div className="preview-info">
                        <span>🎧</span>
                        <span>{formatTime(elapsed)} recorded</span>
                    </div>
                    <audio controls src={audioUrl} className="audio-preview" />
                    <div className="preview-actions">
                        <button onClick={discardRecording} className="btn-ghost">
                            Discard
                        </button>
                        <button onClick={submitRecording} className="btn-primary">
                            Post Recording
                        </button>
                    </div>
                </div>
            )}

            {state === 'submitting' && (
                <div className="recorder-submitting">
                    <div className="loading-spinner" />
                    <p>Uploading recording...</p>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}
        </div>
    );
}
