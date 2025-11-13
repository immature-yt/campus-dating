import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiForm } from '../lib/api';
import StatusBanner from '../components/StatusBanner';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

function genderLabel(value) {
  const found = genderOptions.find((option) => option.value === value);
  return found?.label || '';
}

export default function Profile() {
  const [me, setMe] = useState(null);
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [profilePhotos, setProfilePhotos] = useState([null, null, null]);
  const [profilePreviews, setProfilePreviews] = useState([null, null, null]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((user) => {
        setMe(user);
        setBio(user.bio || '');
        // Initialize previews with existing photos
        if (user.photos && user.photos.length > 0) {
          const previews = [null, null, null];
          user.photos.forEach((photo, index) => {
            if (index < 3) previews[index] = photo.url;
          });
          setProfilePreviews(previews);
        }
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      });
  }, []);

  const handleProfilePhotoChange = (index) => (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      const newPhotos = [...profilePhotos];
      newPhotos[index] = file;
      setProfilePhotos(newPhotos);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPreviews = [...profilePreviews];
        newPreviews[index] = reader.result;
        setProfilePreviews(newPreviews);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProfilePhotos = async () => {
    setPhotoMessage('');
    const filesToUpload = profilePhotos.filter(p => p !== null);
    if (filesToUpload.length === 0) {
      setPhotoMessage('Error: Please select at least one photo to upload');
      return;
    }

    setIsUploadingPhotos(true);
    try {
      const formData = new FormData();
      profilePhotos.forEach((photo, index) => {
        if (photo) formData.append(`profile_photo_${index}`, photo);
      });

      await apiForm('/api/user/update-profile-photos', formData);
      setPhotoMessage('Photos updated successfully!');
      
      // Reset and reload
      setProfilePhotos([null, null, null]);
      const updated = await apiGet('/api/auth/me');
      setMe(updated);
      if (updated.photos && updated.photos.length > 0) {
        const previews = [null, null, null];
        updated.photos.forEach((photo, index) => {
          if (index < 3) previews[index] = photo.url;
        });
        setProfilePreviews(previews);
      }
    } catch (error) {
      setPhotoMessage('Error: ' + (error.message || 'Could not upload photos'));
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const submitBio = async (event) => {
    event.preventDefault();
    setSaveMessage('');
    setIsSaving(true);
    try {
      await apiPost('/api/user/profile', { bio });
      setSaveMessage('Bio updated!');
      const updated = await apiGet('/api/auth/me');
      setMe(updated);
    } catch (error) {
      setSaveMessage('Error: ' + (error.message || 'Could not save bio'));
    } finally {
      setIsSaving(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    
    if (!confirm('All your data, matches, and messages will be permanently deleted. Continue?')) {
      return;
    }

    setIsDeleting(true);
    setSaveMessage('');

    try {
      await apiPost('/api/user/delete-account', {});
      // Clear all local storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/login';
      }
    } catch (error) {
      setSaveMessage('Failed to delete account. Please try again.');
      setIsDeleting(false);
    }
  };

  if (!me) return null;

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>
          Profile
          {me.verification_status === 'approved' && (
            <span className="verified-badge" title="Verified">✓</span>
          )}
        </h1>
      </div>

      {me.verification_status !== 'approved' && me.verification_status !== 'pending' && (
        <div className="verification-alert">
          <strong>Verification Status:</strong> {me.verification_status}
          {me.admin_note && <p>{me.admin_note}</p>}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="profile-info">
            <div className="info-row">
              <span className="info-label">Name</span>
              <span className="info-value">{me.name || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Email</span>
              <span className="info-value">{me.email}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Gender</span>
              <span className="info-value">{genderLabel(me.gender) || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Age</span>
              <span className="info-value">{me.age || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">State</span>
              <span className="info-value">{me.state || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">City</span>
              <span className="info-value">{me.city || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">College</span>
              <span className="info-value">{me.college || 'Not set'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Department</span>
              <span className="info-value">{me.department || 'Not set'}</span>
            </div>
            <div className="info-note">
              <p>
                <span className="warning-icon">!</span>
                These details cannot be changed after registration.
              </p>
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h2>Profile Photos</h2>
          <p className="section-note">You can update your profile photos anytime.</p>
          <div className="upload-grid profile-grid">
            {[0, 1, 2].map((index) => (
              <label key={index} className="upload-box">
                <span className="upload-label">Photo {index + 1}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePhotoChange(index)}
                  style={{ display: 'none' }}
                />
                {profilePreviews[index] ? (
                  <img src={profilePreviews[index]} alt={`Profile ${index + 1}`} className="upload-preview" />
                ) : (
                  <div className="upload-placeholder">
                    <div className="placeholder-icon">📸</div>
                    <span>Click to upload</span>
                  </div>
                )}
              </label>
            ))}
          </div>
          <button 
            type="button" 
            className="save-btn" 
            onClick={uploadProfilePhotos}
            disabled={isUploadingPhotos}
          >
            {isUploadingPhotos ? 'Uploading...' : 'Update Photos'}
          </button>
          {photoMessage && (
            <p className={`feedback ${photoMessage.startsWith('Error') ? 'error' : ''}`}>{photoMessage}</p>
          )}
        </div>

        <div className="profile-section">
          <h2>Bio</h2>
          <form onSubmit={submitBio} className="bio-form">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell everyone what makes you a fun match."
              rows={4}
            />
            <button type="submit" className="save-btn" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Bio'}
            </button>
            {saveMessage && (
              <p className={`feedback ${saveMessage.startsWith('Error') ? 'error' : ''}`}>{saveMessage}</p>
            )}
          </form>
        </div>

        <div className="profile-section">
          <h2>Settings</h2>
          <div className="settings-list">
            <a href="/upload" className="settings-item">
              <span>Verification</span>
              <span>→</span>
            </a>
            {me.isAdmin && (
              <a href="/admin" className="settings-item">
                <span>Admin Panel</span>
                <span>→</span>
              </a>
            )}
            <button type="button" className="settings-item logout" onClick={logout}>
              <span>Logout</span>
              <span>→</span>
            </button>
            <button type="button" className="settings-item delete" onClick={deleteAccount} disabled={isDeleting}>
              <span>{isDeleting ? 'Deleting Account...' : 'Delete Account'}</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

