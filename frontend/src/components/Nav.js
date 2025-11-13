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
    <nav className="top-nav">
      <div className="nav-left">
        <Link href="/" className="brand">
          Campus Dating
        </Link>
        <div className="nav-links">
          <Link href="/" className="nav-link">
            Discover
          </Link>
          {me && (
            <Link href="/dashboard" className="nav-link">
              Dashboard
            </Link>
          )}
          {me && (
            <Link href="/upload" className="nav-link">
              Verify
            </Link>
          )}
          {me?.isAdmin && (
            <Link href="/admin" className="nav-link">
              Admin
            </Link>
          )}
        </div>
      </div>
      <div className="nav-right">
        {!me ? (
          <>
            <Link href="/login" className="nav-btn ghost">
              Log in
            </Link>
            <Link href="/register" className="nav-btn">
              Sign up
            </Link>
          </>
        ) : (
          <button type="button" className="nav-btn ghost" onClick={logout}>
            Log out
          </button>
        )}
      </div>
    </nav>
  );
}
