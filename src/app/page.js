'use client';

import { useState, useEffect, useCallback } from 'react';
import { decryptData } from '@/lib/crypto';
import { getStoredCredentials, storePassword, storeUsername } from '@/lib/auth';
import { ENCRYPTED_GIST_URL } from '@/lib/config';
import PasswordScreen from '@/components/PasswordScreen';
import UsernameScreen from '@/components/UsernameScreen';
import MainScreen from '@/components/MainScreen';

export default function Home() {
  const [appState, setAppState] = useState('loading'); // loading, password, username, main
  const [gistId, setGistId] = useState(null);
  const [gistToken, setGistToken] = useState(null);
  const [username, setUsername] = useState(null);
  const [password, setPassword] = useState(null);

  const tryDecrypt = useCallback(async (pwd) => {
    const result = await decryptData(ENCRYPTED_GIST_URL, pwd);
    if (result && result.includes('|')) {
      const [id, token] = result.split('|');
      setGistId(id);
      setGistToken(token);
      setPassword(pwd);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    async function init() {
      const creds = getStoredCredentials();

      if (creds.password) {
        const success = await tryDecrypt(creds.password);
        if (success) {
          if (creds.username) {
            setUsername(creds.username);
            setAppState('main');
          } else {
            setAppState('username');
          }
          return;
        }
      }
      setAppState('password');
    }

    init();
  }, [tryDecrypt]);

  const handlePasswordSubmit = async (pwd) => {
    const success = await tryDecrypt(pwd);
    if (success) {
      storePassword(pwd);
      const creds = getStoredCredentials();
      if (creds.username) {
        setUsername(creds.username);
        setAppState('main');
      } else {
        setAppState('username');
      }
      return true;
    }
    return false;
  };

  const handleUsernameSubmit = (name) => {
    storeUsername(name);
    setUsername(name);
    setAppState('main');
  };

  if (appState === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (appState === 'password') {
    return <PasswordScreen onSubmit={handlePasswordSubmit} />;
  }

  if (appState === 'username') {
    return <UsernameScreen onSubmit={handleUsernameSubmit} />;
  }

  return (
    <MainScreen
      gistId={gistId}
      gistToken={gistToken}
      username={username}
      password={password}
    />
  );
}
