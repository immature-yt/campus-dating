import { useState } from 'react';
import { apiPost, setAuthToken } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const { token } = await apiPost('/api/auth/login', { email, password });
      setAuthToken(token);
      window.location.href = '/dashboard';
    } catch (e) {
      setMsg('Error: ' + (e.message || 'Failed'));
    }
  };
  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}


