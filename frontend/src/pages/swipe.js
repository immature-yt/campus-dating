import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import StatusBanner from '../components/StatusBanner';
import { apiGet, apiPost } from '../lib/api';

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

  const persistHistoryList = (entries) => {
    const trimmed = entries.slice(0, HISTORY_LIMIT);
    setHistory(trimmed);
    persistList(HISTORY_STORAGE_KEY, trimmed);
  };

  const fetchMatch = async () => {
    if (isFindingMatch) return;
    if (!me?.college) {
      setMatchError('Please complete your profile to start matching.');
      return;
    }
    if (!me?.gender) {
      setMatchError('Please set your gender in your profile to start matching.');
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
      const excludeUsers = [...new Set([...likedUsers, ...skippedUsers, ...myIds])]
        .filter(id => id && id.toString().trim() !== ''); // Filter out empty/invalid IDs

      const params = new URLSearchParams({ 
        college: me.college
      });
      
      // Only add exclude parameter if there are users to exclude
      if (excludeUsers.length > 0) {
        params.append('exclude', excludeUsers.join(','));
      }
      
      console.log('Fetching match - User gender:', me.gender);
      console.log('Excluding users:', excludeUsers);
      
      const response = await apiGet(`/api/match/find?${params.toString()}`);
      if (response.match) {
        // Double-check the match isn't our own profile
        const matchId = (response.match._id || response.match.id)?.toString();
        const isOwnProfile = myIds.some(id => id?.toString() === matchId);
        
        if (isOwnProfile || excludeUsers.includes(matchId)) {
          setMatchError('No new matches found. Try again later!');
        } else {
          console.log('Match found:', response.match.name);
          setMatch(response.match);
        }
      } else {
        setMatchError('No matches found. Try again later!');
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      
      // Try to parse error response as JSON
      let errorData = {};
      let errorMsg = 'Unable to find matches. Please try again.';
      
      try {
        const errorText = error?.message || error?.toString() || '';
        errorData = JSON.parse(errorText);
        errorMsg = errorData.error || errorText;
      } catch (parseErr) {
        errorMsg = error?.message || error?.toString() || 'Unable to find matches. Please try again.';
      }
      
      // Check if user needs to be approved
      if (errorMsg.includes('approved') || errorMsg.includes('verification')) {
        setMatchError('Your account must be approved before you can see matches. Please wait for admin approval.');
      } else if (errorMsg.includes('No matches found') || errorData.error === 'No matches found') {
        if (errorData.debug) {
          const { totalApprovedUsers, excludedUsers } = errorData.debug;
          if (totalApprovedUsers === 0) {
            setMatchError('No approved users found yet. Please check back later once more users join!');
          } else if (totalApprovedUsers === excludedUsers) {
            setMatchError('You\'ve seen all available matches! Check back later for new users.');
          } else {
            setMatchError(`No matches found at this time. Check back later for new users! (${totalApprovedUsers} approved users available)`);
          }
        } else {
          setMatchError('No matches found at this time. Check back later for new users!');
        }
      } else {
        setMatchError(errorMsg);
      }
    } finally {
      setIsFindingMatch(false);
    }
  };

  const handleReaction = async (action) => {
    if (!match || !match._id) {
      console.error('Invalid match data:', match);
      return;
    }
    
    const userId = match._id.toString();
    const entry = {
      userId: userId,
      name: match.name,
      action,
      timestamp: new Date().toISOString()
    };

    persistHistoryList([entry, ...history]);

    if (action === 'like') {
      try {
        console.log('Sending like to user:', userId);
        // Send like to backend
        const response = await apiPost('/api/likes/send', { toUserId: userId });
        console.log('Like response:', response);
        
        if (response.isMatch) {
          // Show match notification
          alert(`🎉 It's a match with ${match.name}! You can now chat!`);
        } else {
          // Show confirmation that like was sent
          console.log('Like sent successfully');
        }
        
        // Add to liked list to prevent showing again
        const likedUsers = safeParse('campus-dating-liked-users', []);
        if (!likedUsers.includes(userId)) {
          persistList('campus-dating-liked-users', [userId, ...likedUsers]);
        }
      } catch (error) {
        console.error('Error sending like:', error);
        alert(`Failed to send like: ${error.message || 'Please try again'}`);
        // Still prevent showing again locally
        const likedUsers = safeParse('campus-dating-liked-users', []);
        if (!likedUsers.includes(userId)) {
          persistList('campus-dating-liked-users', [userId, ...likedUsers]);
        }
      }
    } else if (action === 'skip') {
      // Add to skipped list to prevent showing again
      const skippedUsers = safeParse('campus-dating-skipped-users', []);
      if (!skippedUsers.includes(userId)) {
        persistList('campus-dating-skipped-users', [userId, ...skippedUsers]);
      }
    }

    setMatch(null);
    // Fetch next match (opposite gender filtering is automatic)
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
            <button type="button" className="refresh-btn" onClick={fetchMatch} disabled={isFindingMatch}>
              {isFindingMatch ? 'Searching...' : match ? 'Next' : 'Find Match'}
            </button>
          </div>
        </div>

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

