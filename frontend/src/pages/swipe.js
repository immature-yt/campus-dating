import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StatusBanner from '../components/StatusBanner';
import { apiGet } from '../lib/api';

const HISTORY_STORAGE_KEY = 'campus-dating-match-history';
const HISTORY_LIMIT = 20;

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

function safeParse(storageKey, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (error) {
    return fallback;
  }
}

function persistList(storageKey, value) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }
}

function parseErrorMessage(error) {
  if (!error) return 'Something went wrong';
  const raw = error.message || error.toString();
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error) return parsed.error;
  } catch (err) {
    // ignore parse error
  }
  return raw || 'Something went wrong';
}

function genderLabel(value) {
  const found = genderOptions.find((option) => option.value === value);
  return found?.label || '';
}

export default function Swipe() {
  const [me, setMe] = useState(null);
  const [match, setMatch] = useState(null);
  const [isFindingMatch, setIsFindingMatch] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [history, setHistory] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    interestedIn: '',
    minAge: 18,
    maxAge: 35,
    department: '',
    showVerifiedOnly: false
  });
  const [appliedFilters, setAppliedFilters] = useState({
    interestedIn: '',
    minAge: 18,
    maxAge: 35,
    department: '',
    showVerifiedOnly: false
  });

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((user) => {
        setMe(user);
      })
      .catch(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      });
  }, []);

  useEffect(() => {
    setHistory(safeParse(HISTORY_STORAGE_KEY, []));
  }, []);

  const applyFilters = () => {
    setAppliedFilters({...filters});
    setShowFilters(false);
    setMatch(null);
    fetchMatch(true);
  };

  const clearFilters = () => {
    const defaultFilters = {
      interestedIn: '',
      minAge: 18,
      maxAge: 35,
      department: '',
      showVerifiedOnly: false
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setMatch(null);
    fetchMatch(false);
  };

  const persistHistoryList = (entries) => {
    const trimmed = entries.slice(0, HISTORY_LIMIT);
    setHistory(trimmed);
    persistList(HISTORY_STORAGE_KEY, trimmed);
  };

  const fetchMatch = async (useFilters = false) => {
    if (isFindingMatch) return;
    if (!me?.college) {
      setMatchError('Please complete your profile to start matching.');
      return;
    }

    setIsFindingMatch(true);
    setMatchError('');
    setMatch(null);

    try {
      // Get lists of users already seen
      const likedUsers = safeParse('campus-dating-liked-users', []);
      const skippedUsers = safeParse('campus-dating-skipped-users', []);
      // ALWAYS exclude own profile - use multiple formats to be sure
      const myIds = [me._id, me._id?.toString(), me.id, me.id?.toString()].filter(Boolean);
      const excludeUsers = [...new Set([...likedUsers, ...skippedUsers, ...myIds])];

      const params = new URLSearchParams({ 
        college: me.college,
        exclude: excludeUsers.join(',')
      });
      
      // Only apply filters if explicitly requested
      if (useFilters || appliedFilters.interestedIn) {
        if (appliedFilters.interestedIn) {
          params.append('gender', appliedFilters.interestedIn);
        }
        if (appliedFilters.minAge) {
          params.append('minAge', appliedFilters.minAge);
        }
        if (appliedFilters.maxAge) {
          params.append('maxAge', appliedFilters.maxAge);
        }
        if (appliedFilters.department) {
          params.append('department', appliedFilters.department);
        }
        if (appliedFilters.showVerifiedOnly) {
          params.append('verifiedOnly', 'true');
        }
      }
      
      const response = await apiGet(`/api/match/find?${params.toString()}`);
      if (response.match) {
        // Double-check the match isn't our own profile
        const matchId = (response.match._id || response.match.id)?.toString();
        const isOwnProfile = myIds.some(id => id?.toString() === matchId);
        
        if (isOwnProfile || excludeUsers.includes(matchId)) {
          setMatchError('No new matches found. Try again later!');
        } else {
          console.log('Match data:', response.match);
          console.log('Photos:', response.match.photos);
          console.log('Images:', response.match.images);
          console.log('Prompts:', response.match.prompts);
          setMatch(response.match);
        }
      } else {
        setMatchError('No matches found. Try again later!');
      }
    } catch (error) {
      const errorMsg = parseErrorMessage(error);
      setMatchError(errorMsg || 'Unable to find matches. Please try again.');
    } finally {
      setIsFindingMatch(false);
    }
  };

  const handleReaction = async (action) => {
    if (!match) return;
    const entry = {
      userId: match._id || `anon-${Date.now()}`,
      name: match.name,
      action,
      timestamp: new Date().toISOString()
    };

    persistHistoryList([entry, ...history]);

    if (action === 'like') {
      try {
        // Send like to backend
        const response = await apiPost('/api/likes/send', { toUserId: entry.userId });
        
        if (response.isMatch) {
          // Show match notification
          alert(`🎉 It's a match with ${match.name}! You can now chat!`);
        }
        
        // Add to liked list to prevent showing again
        const likedUsers = safeParse('campus-dating-liked-users', []);
        persistList('campus-dating-liked-users', [entry.userId, ...likedUsers]);
      } catch (error) {
        console.error('Error sending like:', error);
        // Still prevent showing again locally
        const likedUsers = safeParse('campus-dating-liked-users', []);
        persistList('campus-dating-liked-users', [entry.userId, ...likedUsers]);
      }
    } else if (action === 'skip') {
      // Add to skipped list to prevent showing again
      const skippedUsers = safeParse('campus-dating-skipped-users', []);
      persistList('campus-dating-skipped-users', [entry.userId, ...skippedUsers]);
    }

    setMatch(null);
    await fetchMatch();
  };

  if (!me) {
    return (
      <div className="swipe-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swipe-page">
      <div className="swipe-container">
        <div className="swipe-header">
          <h1>Discover</h1>
          <div className="header-actions">
            <button type="button" className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>
              🔍 Filters
            </button>
            <button type="button" className="refresh-btn" onClick={fetchMatch} disabled={isFindingMatch}>
              {isFindingMatch ? 'Searching...' : match ? 'Next' : 'Find Match'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <h3>Filter Preferences</h3>
            <div className="filter-row">
              <label>
                <span>Show me</span>
                <select
                  value={filters.interestedIn}
                  onChange={(e) => setFilters({ ...filters, interestedIn: e.target.value })}
                >
                  <option value="">Everyone</option>
                  <option value="female">Women</option>
                  <option value="male">Men</option>
                  <option value="non_binary">Non-binary</option>
                </select>
              </label>
              <label>
                <span>Age Range</span>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={filters.minAge}
                    onChange={(e) => setFilters({ ...filters, minAge: Number(e.target.value) })}
                    style={{ width: '60px' }}
                  />
                  <span>to</span>
                  <input
                    type="number"
                    min="18"
                    max="99"
                    value={filters.maxAge}
                    onChange={(e) => setFilters({ ...filters, maxAge: Number(e.target.value) })}
                    style={{ width: '60px' }}
                  />
                </div>
              </label>
              <label>
                <span>Department</span>
                <input
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                />
              </label>
            </div>
            <div className="filter-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={filters.showVerifiedOnly}
                  onChange={(e) => setFilters({ ...filters, showVerifiedOnly: e.target.checked })}
                />
                <span>Show verified profiles only</span>
              </label>
            </div>
            <div className="filter-actions">
              <button type="button" className="clear-filters-btn" onClick={clearFilters}>
                Clear All
              </button>
              <button type="button" className="apply-filters-btn" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {matchError && (
          <div className="error-message" role="alert">
            {matchError}
          </div>
        )}

        <div className="swipe-stage">
          <AnimatePresence mode="wait" initial={false}>
            {isFindingMatch && (
              <motion.div
                key="loading"
                className="swipe-placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="loading-spinner" />
                <p>Finding your match...</p>
              </motion.div>
            )}

            {!isFindingMatch && match && (
              <motion.article
                key={match._id || 'fallback-match'}
                className="swipe-card"
                initial={{ opacity: 0, scale: 0.94, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -24 }}
              >
                <div className="hinge-profile">
                  {/* Profile content - vertical scroll */}
                  <div className="profile-scroll">
                    {/* First photo with name overlay */}
                    <div className="profile-section photo-section">
                      {(match.photos && match.photos.length > 0) ? (
                        <img src={match.photos[0].url || match.photos[0]} alt={`${match.name}'s photo 1`} />
                      ) : match.images && match.images.length > 0 ? (
                        <img src={match.images[0]} alt={`${match.name}'s photo 1`} />
                      ) : (
                        <div className="photo-fallback">
                          <span className="fallback-icon">👤</span>
                        </div>
                      )}
                      <div className="name-overlay">
                        <h3>
                          {match.name}, {match.age}
                          {match.verification_status === 'approved' && (
                            <span className="verified-badge" title="Verified">✓</span>
                          )}
                        </h3>
                        <p>{[match.department, match.college].filter(Boolean).join(' • ')}</p>
                        <p className="location">{[match.city, match.state].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>

                    {/* Prompt 1 */}
                    {match.prompts && match.prompts.length > 0 && match.prompts[0].answer && (
                      <div className="profile-section prompt-section">
                        <div className="prompt-question">{match.prompts[0].prompt}</div>
                        <div className="prompt-response">{match.prompts[0].answer}</div>
                      </div>
                    )}

                    {/* Photo 2 */}
                    {match.photos && match.photos[1] ? (
                      <div className="profile-section photo-section">
                        <img src={match.photos[1].url || match.photos[1]} alt={`${match.name}'s photo 2`} />
                      </div>
                    ) : match.images && match.images[1] && (
                      <div className="profile-section photo-section">
                        <img src={match.images[1]} alt={`${match.name}'s photo 2`} />
                      </div>
                    )}

                    {/* Prompt 2 */}
                    {match.prompts && match.prompts.length > 1 && match.prompts[1].answer && (
                      <div className="profile-section prompt-section">
                        <div className="prompt-question">{match.prompts[1].prompt}</div>
                        <div className="prompt-response">{match.prompts[1].answer}</div>
                      </div>
                    )}

                    {/* Photo 3 */}
                    {match.photos && match.photos[2] ? (
                      <div className="profile-section photo-section">
                        <img src={match.photos[2].url || match.photos[2]} alt={`${match.name}'s photo 3`} />
                      </div>
                    ) : match.images && match.images[2] && (
                      <div className="profile-section photo-section">
                        <img src={match.images[2]} alt={`${match.name}'s photo 3`} />
                      </div>
                    )}

                    {/* Prompt 3 */}
                    {match.prompts && match.prompts.length > 2 && match.prompts[2].answer && (
                      <div className="profile-section prompt-section">
                        <div className="prompt-question">{match.prompts[2].prompt}</div>
                        <div className="prompt-response">{match.prompts[2].answer}</div>
                      </div>
                    )}

                    {/* Bio section */}
                    {match.bio && (
                      <div className="profile-section bio-section">
                        <div className="section-title">About Me</div>
                        <p>{match.bio}</p>
                      </div>
                    )}

                    {/* Action buttons at bottom */}
                    <div className="bottom-actions">
                      <button type="button" className="bottom-skip-btn" onClick={() => handleReaction('skip')}>
                        ✕ Skip
                      </button>
                      <button type="button" className="bottom-like-btn" onClick={() => handleReaction('like')}>
                        ♥ Like
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            )}

            {!isFindingMatch && !match && !matchError && (
              <motion.div
                key="empty"
                    className="swipe-placeholder"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                  >
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💕</div>
                    <p style={{ fontSize: '1.1rem', fontWeight: 500, marginBottom: '0.5rem' }}>Ready to find your match?</p>
                    <p style={{ fontSize: '0.9rem' }}>Tap "Find Match" to start swiping!</p>
                  </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

