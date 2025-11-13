import { useEffect, useState } from 'react';
import { apiGet, apiForm } from '../lib/api';

export default function Upload() {
  const [me, setMe] = useState(null);
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiGet('/api/auth/me')
      .then(setMe)
      .catch(() => (window.location.href = '/login'));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!idPhoto || !selfiePhoto) {
      setMessage('College ID photo and selfie are required.');
      return;
    }
    setMessage('');
    const fd = new FormData();
    fd.append('id_photo', idPhoto);
    fd.append('selfie_photo', selfiePhoto);
    if (profilePhoto) fd.append('profile_photo', profilePhoto);
    try {
      const res = await apiForm('/api/user/upload-id', fd);
      setMessage(res.message || 'Uploaded');
    } catch (error) {
      setMessage('Error: ' + (error.message || 'Failed'));
    }
  };

  if (!me) return null;
  const locked = me.verification_status === 'reupload_required' || me.verification_status === 'declined';

  return (
    <section className="upload-shell">
      <div className="surface-card upload-card">
        <h1>Verification Uploads</h1>
        <p className="subtle-text">
          Upload your campus ID and selfie so our team can approve your profile. This keeps the dating pool genuine.
        </p>
        {locked && <p className="feedback error">Your account is temporarily locked until you re-upload your documents.</p>}

        <form className="upload-form" onSubmit={submit}>
          <fieldset>
            <legend>College ID</legend>
            <p className="subtle-text">Accepted types: JPG, PNG, WebP (max 5MB)</p>
            <input type="file" accept="image/*" onChange={(event) => setIdPhoto(event.target.files?.[0] || null)} />
            {idPhoto && (
              <img alt="College ID preview" src={URL.createObjectURL(idPhoto)} className="upload-preview" />
            )}
          </fieldset>

          <fieldset>
            <legend>Selfie with ID</legend>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setSelfiePhoto(event.target.files?.[0] || null)}
            />
            {selfiePhoto && (
              <img alt="Selfie preview" src={URL.createObjectURL(selfiePhoto)} className="upload-preview" />
            )}
          </fieldset>

          <fieldset>
            <legend>Optional profile photo</legend>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => setProfilePhoto(event.target.files?.[0] || null)}
            />
            {profilePhoto && (
              <img alt="Profile preview" src={URL.createObjectURL(profilePhoto)} className="upload-preview" />
            )}
          </fieldset>

          <button type="submit" className="primary-btn">
            Submit for review
          </button>
        </form>

        {message && <p className={`feedback ${message.startsWith('Error') ? 'error' : ''}`}>{message}</p>}
      </div>
    </section>
  );
}

