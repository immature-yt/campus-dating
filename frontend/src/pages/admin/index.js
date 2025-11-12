import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../../lib/api';

export default function Admin() {
  const [me, setMe] = useState(null);
  const [pending, setPending] = useState([]);
  const [noteById, setNoteById] = useState({});
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((u) => {
        if (!u.isAdmin) window.location.href = '/';
        setMe(u);
      })
      .catch(() => (window.location.href = '/login'));
  }, []);

  const load = async () => {
    const [p, l] = await Promise.all([apiGet('/api/admin/pending'), apiGet('/api/admin/audit-log')]);
    setPending(p);
    setLogs(l);
  };
  useEffect(() => {
    if (me) load();
  }, [me]);

  const approve = async (id) => {
    await apiPost('/api/admin/approve', { userId: id, note: noteById[id] || '' });
    await load();
  };
  const reupload = async (id) => {
    await apiPost('/api/admin/request-reupload', { userId: id, note: noteById[id] || '' });
    await load();
  };
  const decline = async (id) => {
    await apiPost('/api/admin/decline', { userId: id, note: noteById[id] || '' });
    await load();
  };

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <h3>Pending / Reupload Users</h3>
      <div style={{ display: 'grid', gap: 16 }}>
        {pending.map((u) => (
          <div key={u._id} style={{ border: '1px solid #ddd', borderRadius: 6, padding: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div>
                <div><strong>{u.email}</strong></div>
                <div>{u.name || '(no name)'} — {u.college || ''} {u.year || ''}</div>
                <div>Status: {u.verification_status}</div>
                <div>Joined: {new Date(u.createdAt).toLocaleString()}</div>
                <textarea
                  placeholder="Note to user (optional)"
                  value={noteById[u._id] || ''}
                  style={{ width: 280, height: 60, marginTop: 6 }}
                  onChange={(e) => setNoteById({ ...noteById, [u._id]: e.target.value })}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button onClick={() => approve(u._id)}>Approve</button>
                  <button onClick={() => reupload(u._id)}>Request Re-upload</button>
                  <button onClick={() => decline(u._id)}>Decline</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <div>ID Photo</div>
                  {u.id_photo_url ? (
                    <img alt="id" src={u.id_photo_url} style={{ maxWidth: 220, border: '1px solid #ccc' }} />
                  ) : (
                    <div>No ID</div>
                  )}
                </div>
                <div>
                  <div>Selfie</div>
                  {u.selfie_url ? (
                    <img alt="selfie" src={u.selfie_url} style={{ maxWidth: 220, border: '1px solid #ccc' }} />
                  ) : (
                    <div>No Selfie</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h3 style={{ marginTop: 24 }}>Audit Log (recent)</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {logs.map((l) => (
          <div key={l.id} style={{ borderBottom: '1px solid #eee', paddingBottom: 8 }}>
            <div>
              <strong>{l.action}</strong> — user: {l.userEmail} — admin: {l.adminEmail} — {new Date(l.timestamp).toLocaleString()}
            </div>
            {l.note ? <div>Note: {l.note}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}


