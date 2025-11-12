import Link from 'next/link';

export default function Home() {
  return (
    <div>
      <h1>Campus Dating</h1>
      <p>Meet students from your campus. Secure, simple verification.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href="/register">Register</Link>
        <Link href="/login">Login</Link>
      </div>
    </div>
  );
}


