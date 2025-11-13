import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { apiPost, apiForm } from '../lib/api';
import { getStates, getCitiesForState, getCollegesForStateCity } from '../data/locations';
import { getPrompts } from '../data/prompts';

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

export default function Register() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    gender: '',
    age: '',
    state: '',
    city: '',
    college: '',
    department: '',
    bio: ''
  });
  
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [profilePhotos, setProfilePhotos] = useState([null, null, null]);
  const [idPreview, setIdPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [profilePreviews, setProfilePreviews] = useState([null, null, null]);
  
  const [selectedPrompts, setSelectedPrompts] = useState(['', '', '']);
  const [promptAnswers, setPromptAnswers] = useState(['', '', '']);
  const allPrompts = useMemo(() => getPrompts(), []);
  
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const states = useMemo(() => getStates(), []);
  const availableCities = useMemo(() => getCitiesForState(form.state), [form.state]);
  const availableColleges = useMemo(
    () => getCollegesForStateCity(form.state, form.city),
    [form.state, form.city]
  );

  const updateForm = (field) => (event) => {
    const value = event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    if (!availableCities.includes(form.city)) {
      setForm((prev) => ({
        ...prev,
        city: '',
        college: ''
      }));
    }
  }, [form.state, availableCities]);

  useEffect(() => {
    if (!availableColleges.includes(form.college)) {
      setForm((prev) => ({
        ...prev,
        college: ''
      }));
    }
  }, [form.city, availableColleges]);

  const handleFileChange = (setter, previewSetter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setter(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const updatePrompt = (index) => (e) => {
    const newPrompts = [...selectedPrompts];
    newPrompts[index] = e.target.value;
    setSelectedPrompts(newPrompts);
  };

  const updateAnswer = (index) => (e) => {
    const newAnswers = [...promptAnswers];
    newAnswers[index] = e.target.value;
    setPromptAnswers(newAnswers);
  };

  const validateStep1 = () => {
    if (!form.email || !form.password || !form.name || !form.gender || !form.age || !form.state || !form.city || !form.college || !form.department) {
      setMessage('Error: Please fill in all required fields');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!idPhoto || !selfiePhoto) {
      setMessage('Error: College ID and selfie are required for verification');
      return false;
    }
    const uploadedPhotos = profilePhotos.filter(p => p !== null);
    if (uploadedPhotos.length < 3) {
      setMessage('Error: Please upload all 3 profile photos');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const filledPrompts = selectedPrompts.filter((p, i) => p && promptAnswers[i].trim()).length;
    if (filledPrompts < 3) {
      setMessage('Error: Please select and answer at least 3 prompts');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setMessage('');
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    setMessage('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    setIsSubmitting(true);
    try {
      // First create the account
      const registerData = {
        email: form.email,
        password: form.password,
        name: form.name,
        gender: form.gender,
        age: Number(form.age),
        state: form.state,
        city: form.city,
        college: form.college,
        department: form.department,
        bio: form.bio,
        prompts: selectedPrompts.map((prompt, i) => ({
          prompt,
          answer: promptAnswers[i]
        })).filter(p => p.prompt && p.answer)
      };

      const { token } = await apiPost('/api/auth/register', registerData);
      
      // Then upload photos
      const formData = new FormData();
      formData.append('id_photo', idPhoto);
      formData.append('selfie_photo', selfiePhoto);
      profilePhotos.forEach((photo, index) => {
        if (photo) formData.append(`profile_photo_${index}`, photo);
      });

      // Set auth token for the photo upload
      localStorage.setItem('token', token);
      await apiForm('/api/user/upload-photos', formData);
      
      setMessage('Registered successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/swipe';
      }, 2000);
    } catch (error) {
      setMessage('Error: ' + (error.message || 'Registration failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const availablePrompts = (currentIndex) => {
    return allPrompts.filter(p => !selectedPrompts.includes(p) || selectedPrompts[currentIndex] === p);
  };

  return (
    <section className="auth-shell">
      <div className="auth-card registration-card">
        <div className="registration-progress">
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>3</div>
        </div>

        <h1>Create Your Profile</h1>
        <p className="subtle-text">
          {step === 1 && 'Basic information (cannot be changed later)'}
          {step === 2 && 'Upload verification & profile photos'}
          {step === 3 && 'Choose and answer prompts'}
        </p>

        <form onSubmit={submit} className="auth-form registration-form">
          {step === 1 && (
            <>
              <label>
                <span>Campus email *</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={updateForm('email')}
                  required
                />
              </label>
              <label>
                <span>Password *</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={updateForm('password')}
                  required
                />
              </label>
              <label>
                <span>Full Name *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={updateForm('name')}
                  required
                />
              </label>
              <label>
                <span>Gender *</span>
                <select value={form.gender} onChange={updateForm('gender')} required>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Age *</span>
                <input
                  type="number"
                  min="18"
                  max="120"
                  value={form.age}
                  onChange={updateForm('age')}
                  required
                />
              </label>
              <label>
                <span>State *</span>
                <select value={form.state} onChange={updateForm('state')} required>
                  <option value="">Select state</option>
                  {states.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>City *</span>
                <select value={form.city} onChange={updateForm('city')} disabled={!form.state} required>
                  <option value="">{form.state ? 'Select city' : 'Choose state first'}</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>College *</span>
                <select
                  value={form.college}
                  onChange={updateForm('college')}
                  disabled={!form.city || availableColleges.length === 0}
                  required
                >
                  <option value="">
                    {form.city
                      ? availableColleges.length > 0
                        ? 'Select college'
                        : 'No colleges listed yet'
                      : 'Choose city first'}
                  </option>
                  {availableColleges.map((college) => (
                    <option key={college} value={college}>
                      {college}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Department/Degree *</span>
                <input
                  type="text"
                  placeholder="e.g., Computer Science, MBA, B.Tech"
                  value={form.department}
                  onChange={updateForm('department')}
                  required
                />
              </label>
              <label>
                <span>Bio</span>
                <textarea
                  value={form.bio}
                  onChange={updateForm('bio')}
                  placeholder="Tell everyone what makes you a fun match."
                  rows={3}
                />
              </label>
              <button type="button" className="primary-btn" onClick={nextStep}>
                Next: Upload Photos
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="photo-upload-section">
                <h3>Verification Photos (Required)</h3>
                <div className="upload-grid">
                  <label className="upload-box">
                    <span className="upload-label">College ID *</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setIdPhoto, setIdPreview)}
                      style={{ display: 'none' }}
                    />
                    {idPreview ? (
                      <img src={idPreview} alt="ID preview" className="upload-preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <div className="placeholder-icon">🪪</div>
                        <span>Click to upload ID</span>
                      </div>
                    )}
                  </label>
                  <label className="upload-box">
                    <span className="upload-label">Selfie with ID *</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange(setSelfiePhoto, setSelfiePreview)}
                      style={{ display: 'none' }}
                    />
                    {selfiePreview ? (
                      <img src={selfiePreview} alt="Selfie preview" className="upload-preview" />
                    ) : (
                      <div className="upload-placeholder">
                        <div className="placeholder-icon">🤳</div>
                        <span>Click to upload selfie</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="photo-upload-section">
                <h3>Profile Photos (3 Required)</h3>
                <p className="warning-text">
                  <span className="warning-icon">!</span>
                  At least one photo should clearly show your face
                </p>
                <div className="upload-grid profile-grid">
                  {[0, 1, 2].map((index) => (
                    <label key={index} className="upload-box">
                      <span className="upload-label">Photo {index + 1} *</span>
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
              </div>

              <div className="button-group">
                <button type="button" className="secondary-btn" onClick={prevStep}>
                  Back
                </button>
                <button type="button" className="primary-btn" onClick={nextStep}>
                  Next: Add Prompts
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="prompts-section">
                <h3>Choose & Answer Prompts (Min. 3)</h3>
                <p className="subtle-text">These will be displayed on your profile</p>
                
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="prompt-item">
                    <label>
                      <span>Prompt {index + 1} {index < 3 ? '*' : ''}</span>
                      <select
                        value={selectedPrompts[index] || ''}
                        onChange={updatePrompt(index)}
                        required={index < 3}
                      >
                        <option value="">Select a prompt</option>
                        {availablePrompts(index).map((prompt) => (
                          <option key={prompt} value={prompt}>
                            {prompt}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedPrompts[index] && (
                      <label>
                        <span>Your Answer {index < 3 ? '*' : ''}</span>
                        <textarea
                          value={promptAnswers[index]}
                          onChange={updateAnswer(index)}
                          placeholder="Your answer..."
                          rows={2}
                          required={index < 3 && selectedPrompts[index]}
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>

              <div className="button-group">
                <button type="button" className="secondary-btn" onClick={prevStep}>
                  Back
                </button>
                <button type="submit" className="primary-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
                </button>
              </div>
            </>
          )}
        </form>

        {message && <p className={`feedback ${message.startsWith('Error') ? 'error' : ''}`}>{message}</p>}

        <p className="support-link">
          Already have an account? <Link href="/login">Log in here</Link>.
        </p>
      </div>
    </section>
  );
}
