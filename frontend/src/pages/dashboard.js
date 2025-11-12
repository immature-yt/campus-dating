import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import StatusBanner from '../components/StatusBanner';

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ name: '', college: '', year: '', bio: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((u) => {
        setMe(u);
        setForm({
          name: u.name || '',
          college: u.college || '',
          year: u.year || '',
          bio: u.bio || ''
        });
      })
      .catch(() => (window.location.href = '/login'));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await apiPost('/api/user/profile', form);
      setMsg('Saved.');
    } catch (e) {
      setMsg('Error: ' + (e.message || 'Failed'));
    }
  };

  if (!me) return null;
  return (
    <div>
      <h2>Dashboard</h2>
      <StatusBanner status={me.verification_status} adminNote={me.admin_note} />
      <h3 style={{ marginTop: 16 }}>Profile</h3>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input placeholder="College" value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} />
        <input placeholder="Year" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        <textarea placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <button type="submit">Save</button>
      </form>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}


