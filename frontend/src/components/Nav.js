import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

export default function Nav() {
  const [me, setMe] = useState(null);
  useEffect(() => {
    apiGet('/api/auth/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, []);
  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };
  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #eee' }}>
      <Link href="/">Home</Link>
      {!me && (
        <>
          <Link href="/register">Register</Link>
          <Link href="/login">Login</Link>
        </>
      )}
      {me && (
        <>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/upload">Upload</Link>
          {me.isAdmin && <Link href="/admin">Admin</Link>}
          <button onClick={logout} style={{ marginLeft: 'auto' }}>Logout</button>
        </>
      )}
    </nav>
  );
}


