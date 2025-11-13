import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { useRouter } from 'next/router';

export default function Likes() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [likesReceived, setLikesReceived] = useState([]);
  const [likesSent, setLikesSent] = useState([]);
  const [matches, setMatches] = useState([]);
  const [activeTab, setActiveTab] = useState('received');

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
    if (me) {
      loadLikes();
    }
  }, [me]);

  const loadLikes = async () => {
    try {
      const [received, sent, matchesData] = await Promise.all([
        apiGet('/api/likes/received'),
        apiGet('/api/likes/sent'),
        apiGet('/api/likes/matches')
      ]);
      
      setLikesReceived(received.likes || []);
      setLikesSent(sent.likes || []);
      setMatches(matchesData.matches || []);
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };

  const likeBack = async (fromUserId) => {
    try {
      await apiPost('/api/likes/like-back', { fromUserId });
      alert('🎉 It\'s a match! You can now start chatting!');
      await loadLikes();
    } catch (error) {
      console.error('Error liking back:', error);
      alert('Failed to like back. Please try again.');
    }
  };

  const pass = async (fromUserId) => {
    try {
      await apiPost('/api/likes/pass', { fromUserId });
      await loadLikes();
    } catch (error) {
      console.error('Error passing:', error);
    }
  };

  if (!me) return null;

  const getPendingLikes = () => {
    return likesSent.filter(like => like.status === 'pending');
  };

  return (
    <div className="likes-page">
      <div className="page-header">
        <h1>Likes</h1>
      </div>

      {/* Tab Navigation */}
      <div className="likes-tabs">
        <button 
          className={activeTab === 'received' ? 'active' : ''} 
          onClick={() => setActiveTab('received')}
        >
          People Who Liked You ({likesReceived.length})
        </button>
        <button 
          className={activeTab === 'sent' ? 'active' : ''} 
          onClick={() => setActiveTab('sent')}
        >
          Likes You Sent ({getPendingLikes().length})
        </button>
        <button 
          className={activeTab === 'matches' ? 'active' : ''} 
          onClick={() => setActiveTab('matches')}
        >
          Matches ({matches.length})
        </button>
      </div>

      {/* People Who Liked You */}
      {activeTab === 'received' && (
        <div className="likes-section">
          {likesReceived.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
              <h3>No one liked you yet</h3>
              <p>Keep swiping! When someone likes you, they'll appear here.</p>
            </div>
          ) : (
            <div className="likes-grid">
              {likesReceived.map((like) => {
                const user = like.fromUser;
                return (
                  <div key={like._id} className="like-card">
                    <div className="like-photo">
                      {user.photos && user.photos.length > 0 ? (
                        <img src={user.photos[0].url || user.photos[0]} alt={user.name} />
                      ) : (
                        <div className="photo-fallback">
                          <span className="fallback-icon">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="like-info">
                      <h3>
                        {user.name}, {user.age}
                        {user.verification_status === 'approved' && (
                          <span className="verified-badge" title="Verified">✓</span>
                        )}
                      </h3>
                      <p>{[user.department, user.college].filter(Boolean).join(' • ')}</p>
                    </div>
                    <div className="like-actions-row">
                      <button
                        className="pass-btn"
                        onClick={() => pass(user._id)}
                      >
                        Pass
                      </button>
                      <button
                        className="like-back-btn"
                        onClick={() => likeBack(user._id)}
                      >
                        ♥ Like Back
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Likes You Sent (Pending) */}
      {activeTab === 'sent' && (
        <div className="likes-section">
          {getPendingLikes().length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⭐</div>
              <h3>No pending likes</h3>
              <p>Start swiping and like someone!</p>
            </div>
          ) : (
            <div className="likes-grid">
              {getPendingLikes().map((like) => {
                const user = like.toUser;
                return (
                  <div key={like._id} className="like-card">
                    <div className="like-photo">
                      {user.photos && user.photos.length > 0 ? (
                        <img src={user.photos[0].url || user.photos[0]} alt={user.name} />
                      ) : (
                        <div className="photo-fallback">
                          <span className="fallback-icon">👤</span>
                        </div>
                      )}
                    </div>
                    <div className="like-info">
                      <h3>
                        {user.name}, {user.age}
                        {user.verification_status === 'approved' && (
                          <span className="verified-badge" title="Verified">✓</span>
                        )}
                      </h3>
                      <p>{[user.department, user.college].filter(Boolean).join(' • ')}</p>
                      <p className="pending-text">Waiting for them to like you back...</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Matches */}
      {activeTab === 'matches' && (
        <div className="likes-section">
          {matches.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💕</div>
              <h3>No matches yet</h3>
              <p>Like people back when they like you to create a match!</p>
            </div>
          ) : (
            <div className="likes-grid">
              {matches.map((user) => (
                <div key={user._id} className="match-card">
                  <div className="like-photo">
                    {user.photos && user.photos.length > 0 ? (
                      <img src={user.photos[0].url || user.photos[0]} alt={user.name} />
                    ) : (
                      <div className="photo-fallback">
                        <span className="fallback-icon">👤</span>
                      </div>
                    )}
                  </div>
                  <div className="like-info">
                    <h3>
                      {user.name}, {user.age}
                      {user.verification_status === 'approved' && (
                        <span className="verified-badge" title="Verified">✓</span>
                      )}
                    </h3>
                    <p>{[user.department, user.college].filter(Boolean).join(' • ')}</p>
                  </div>
                  <button
                    className="message-btn"
                    onClick={() => router.push(`/chats?id=${user._id}`)}
                  >
                    💬 Message
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

