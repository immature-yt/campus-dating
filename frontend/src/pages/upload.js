import { useEffect, useState } from 'react';
import { apiGet, apiForm } from '../lib/api';

export default function Upload() {
  const [me, setMe] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    apiGet('/api/auth/me')
      .then(setMe)
      .catch(() => (window.location.href = '/login'));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!idPhoto || !selfiePhoto) {
      setMsg('ID and selfie are required.');
      return;
    }
    setMsg('');
    const fd = new FormData();
    fd.append('id_photo', idPhoto);
    fd.append('selfie_photo', selfiePhoto);
    if (profilePhoto) fd.append('profile_photo', profilePhoto);
    try {
      const res = await apiForm('/api/user/upload-id', fd);
      setMsg(res.message || 'Uploaded');
    } catch (e) {
      setMsg('Error: ' + (e.message || 'Failed'));
    }
  };

  if (!me) return null;
  const locked = me.verification_status === 'reupload_required' || me.verification_status === 'declined';
  return (
    <div>
      <h2>Upload Verification</h2>
      {locked && <p>Your account is locked until you re-upload.</p>}
      <form onSubmit={submit} style={{ display: 'grid', gap: 12, maxWidth: 420 }}>
        <div>
          <div><strong>College ID Photo</strong> (JPG/PNG/WebP, max 5MB)</div>
          <input type="file" accept="image/*" onChange={(e) => setIdPhoto(e.target.files?.[0] || null)} />
          {idPhoto && <img alt="id preview" src={URL.createObjectURL(idPhoto)} style={{ maxWidth: 200, marginTop: 6 }} />}
        </div>
        <div>
          <div><strong>Selfie holding the ID</strong></div>
          <input type="file" accept="image/*" onChange={(e) => setSelfiePhoto(e.target.files?.[0] || null)} />
          {selfiePhoto && <img alt="selfie preview" src={URL.createObjectURL(selfiePhoto)} style={{ maxWidth: 200, marginTop: 6 }} />}
        </div>
        <div>
          <div>Optional profile photo</div>
          <input type="file" accept="image/*" onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)} />
          {profilePhoto && <img alt="profile preview" src={URL.createObjectURL(profilePhoto)} style={{ maxWidth: 200, marginTop: 6 }} />}
        </div>
        <button type="submit">Submit</button>
      </form>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}


