import { useState, useEffect, useRef } from 'react';
import { apiGet } from '../lib/api';
import { getSocket } from '../lib/socket';

export default function TruthDareGame({ chatId, otherUserId, otherUserName, onClose, onStart }) {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionType, setQuestionType] = useState(null);
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [skipsRemaining, setSkipsRemaining] = useState(2);
  const [isWaiting, setIsWaiting] = useState(false);
  const [gameStats, setGameStats] = useState({ truths: 0, dares: 0 });
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('game:start', ({ fromUserId, gameType }) => {
      if (fromUserId === otherUserId) {
        setIsWaiting(true);
        // Game started by other user
      }
    });

    socket.on('game:response', ({ fromUserId, response }) => {
      if (fromUserId === otherUserId) {
        // Handle response from other user
        if (response === 'next') {
          loadNextQuestion();
        }
      }
    });

    return () => {
      socket.off('game:start');
      socket.off('game:response');
    };
  }, [otherUserId]);

  const loadNextQuestion = async (type = null) => {
    try {
      setIsWaiting(false);
      const endpoint = type === 'truth' ? '/api/game/truth' : 
                      type === 'dare' ? '/api/game/dare' : 
                      '/api/game/random';
      const response = await apiGet(endpoint);
      setCurrentQuestion(response.question);
      setQuestionType(response.type);
    } catch (error) {
      console.error('Error loading question:', error);
      alert('Failed to load question');
    }
  };

  const handleAccept = () => {
    if (questionType === 'truth') {
      setGameStats(prev => ({ ...prev, truths: prev.truths + 1 }));
    } else {
      setGameStats(prev => ({ ...prev, dares: prev.dares + 1 }));
    }
    // Notify other user
    if (socketRef.current) {
      socketRef.current.emit('game:response', {
        toUserId: otherUserId,
        response: 'accepted'
      });
    }
    // Load next question after a delay
    setTimeout(() => {
      loadNextQuestion();
    }, 2000);
  };

  const handleSkip = () => {
    if (skipsRemaining > 0) {
      setSkipsUsed(skipsUsed + 1);
      setSkipsRemaining(skipsRemaining - 1);
      loadNextQuestion();
    } else {
      alert('You have used all your skips for this round!');
    }
  };

  const startGame = (type) => {
    if (socketRef.current) {
      socketRef.current.emit('game:start', {
        toUserId: otherUserId,
        gameType: type || 'random'
      });
    }
    loadNextQuestion(type);
    if (onStart) onStart();
  };

  return (
    <div className="game-container" onClick={(e) => e.target.className === 'game-container' && onClose()}>
      <div className="game-modal" onClick={(e) => e.stopPropagation()}>
        <div className="game-header">
          <h2>Truth or Dare</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {!currentQuestion ? (
          <div className="game-content">
            <p>Choose a game mode:</p>
            <div className="game-actions" style={{ flexDirection: 'column', gap: '1rem' }}>
              <button className="game-btn accept" onClick={() => startGame('random')}>
                Random
              </button>
              <button className="game-btn accept" onClick={() => startGame('truth')}>
                Truth Only
              </button>
              <button className="game-btn accept" onClick={() => startGame('dare')}>
                Dare Only
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="game-content">
              <div className={`game-type-badge ${questionType}`}>
                {questionType === 'truth' ? 'Truth' : 'Dare'}
              </div>
              <div className="game-question">
                {currentQuestion}
              </div>
              <div className="game-actions">
                <button className="game-btn accept" onClick={handleAccept}>
                  Accept
                </button>
                <button 
                  className="game-btn skip" 
                  onClick={handleSkip}
                  disabled={skipsRemaining === 0}
                  style={{ opacity: skipsRemaining === 0 ? 0.5 : 1 }}
                >
                  Skip ({skipsRemaining} left)
                </button>
              </div>
            </div>
            <div className="game-stats">
              <div className="game-stat">
                <div className="game-stat-value">{gameStats.truths}</div>
                <div className="game-stat-label">Truths</div>
              </div>
              <div className="game-stat">
                <div className="game-stat-value">{gameStats.dares}</div>
                <div className="game-stat-label">Dares</div>
              </div>
              <div className="game-stat">
                <div className="game-stat-value">{skipsUsed}</div>
                <div className="game-stat-label">Skips Used</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

