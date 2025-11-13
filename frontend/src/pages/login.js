import Link from 'next/link';
import { useState } from 'react';
import { apiPost, setAuthToken } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const { token } = await apiPost('/api/auth/login', { email, password });
      setAuthToken(token);
      window.location.href = '/swipe';
    } catch (error) {
      setMessage('Error: ' + (error.message || 'Login failed'));
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <h1>Log in and keep swiping</h1>
        <p className="subtle-text">Access your matches, chats, and the latest likes on your profile.</p>

        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Email</span>
            <input
              placeholder="you@campus.edu"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            <span>Password</span>
            <input
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" className="primary-btn">
            Log in
          </button>
        </form>

        {message && <p className={`feedback ${message.startsWith('Error') ? 'error' : ''}`}>{message}</p>}

        <p className="support-link">
          Don’t have an account? <Link href="/register">Sign up here</Link>.
        </p>
      </div>
    </section>
  );
}
