import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiGet } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiGet('/api/auth/me')
        .then(() => {
          router.push('/swipe');
        })
        .catch(() => {
          localStorage.removeItem('token');
          setChecking(false);
        });
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return null;
  }

  return (
    <section className="hero">
      <div className="hero-card">
        <h1>Swipe smart across your campus</h1>
        <p>
          Campus Dating keeps the spark on campus: verified profiles, curated matches, and a cozy chat lounge built for
          university life.
        </p>
        <div className="hero-actions">
          <Link href="/register" className="primary-btn">
            Create your profile
          </Link>
          <Link href="/login" className="secondary-btn">
            I already have an account
          </Link>
        </div>
      </div>
      <div className="hero-highlights">
        <div>
          <h3>Verified vibes only</h3>
          <p>Every student uploads their ID before joining the deck.</p>
        </div>
        <div>
          <h3>Match • Chat • Meet</h3>
          <p>Swipe to match, see who likes you, and start conversations instantly.</p>
        </div>
        <div>
          <h3>Built for Indian campuses</h3>
          <p>Select your state, city, and college to find people studying alongside you.</p>
        </div>
      </div>
    </section>
  );
}
