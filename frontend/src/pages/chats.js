import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiGet, apiPost } from '../lib/api';

// Custom Voice Note Player Component
function VoiceNotePlayer({ audioUrl }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const progressRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e) => {
    const audio = audioRef.current;
    if (!audio || !progressRef.current || duration === 0) return;

    e.preventDefault();
    e.stopPropagation();
    
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0]?.clientX) || 0;
    const clickX = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    audio.currentTime = percentage * duration;
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!audioUrl) {
    return (
      <div className="voice-note-player">
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Voice note unavailable
        </span>
      </div>
    );
  }

  return (
    <div className="voice-note-player">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button 
        type="button"
        className="voice-play-btn" 
        onClick={togglePlayPause}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <rect x="3" y="2" width="2" height="8" fill="currentColor" />
            <rect x="7" y="2" width="2" height="8" fill="currentColor" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 2L10 6L3 10V2Z" fill="currentColor" />
          </svg>
        )}
      </button>
      <div className="voice-progress-container">
        <div 
          ref={progressRef}
          className="voice-progress-bar" 
          onClick={handleProgressClick}
          onTouchEnd={handleProgressClick}
        >
          <div 
            className="voice-progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="voice-time">
          <span>{formatTime(currentTime)}</span>
          <span className="voice-time-separator">/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}


export default function Chats() {
  const router = useRouter();
  const { id: chatId } = router.query;
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [swipeData, setSwipeData] = useState({});
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

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

  // Load conversations from backend
  useEffect(() => {
    if (me) {
      loadConversations();
    }
  }, [me]);

  // Load messages for specific chat
  useEffect(() => {
    if (chatId && me) {
      loadChatMessages(chatId);
      // Set up auto-refresh every 3 seconds
      const interval = setInterval(() => {
        loadChatMessages(chatId);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [chatId, me]);

  const loadConversations = async () => {
    try {
      const response = await apiGet('/api/messages/conversations');
      const conversations = response.conversations || [];
      const formattedConversations = conversations.map(conv => ({
        id: conv.userId,
        name: conv.name,
        preview: conv.lastMessage?.content?.substring(0, 50) || 'Start the conversation!',
        time: conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString() : 'now',
        photos: conv.photos
      }));
      setMessages(formattedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to empty array
      setMessages([]);
    }
  };

  const loadChatMessages = async (userId, preserveOptimistic = false) => {
    try {
      if (!userId || !me) return;
      
      const response = await apiGet(`/api/messages/${userId}`);
      const messages = response.messages || [];
      const formattedMessages = messages.map(msg => {
        const fromUserId = typeof msg.fromUser === 'object' ? msg.fromUser._id : msg.fromUser;
        const fromUserIdStr = fromUserId?.toString();
        const myIdStr = me._id?.toString();
        const isFromMe = fromUserIdStr === myIdStr;
        
        // Format replyTo message if it exists
        let replyToMessage = null;
        if (msg.replyTo) {
          const replyToMsg = typeof msg.replyTo === 'object' ? msg.replyTo : null;
          if (replyToMsg) {
            const replyFromUserId = typeof replyToMsg.fromUser === 'object' ? replyToMsg.fromUser._id : replyToMsg.fromUser;
            const replyFromUserIdStr = replyFromUserId?.toString();
            const myIdStr = me._id?.toString();
            const isReplyFromMe = replyFromUserIdStr === myIdStr;
            
            replyToMessage = {
              id: replyToMsg._id,
              type: replyToMsg.messageType || 'text',
              text: replyToMsg.content,
              audioUrl: replyToMsg.messageType === 'voice' ? replyToMsg.mediaUrl : null,
              imageUrl: replyToMsg.messageType === 'image' ? replyToMsg.mediaUrl : null,
              videoUrl: replyToMsg.messageType === 'video' ? replyToMsg.mediaUrl : null,
              sender: isReplyFromMe ? 'me' : 'other'
            };
          }
        }
        
        return {
          id: msg._id,
          type: msg.messageType || 'text',
          text: msg.content,
          audioUrl: msg.messageType === 'voice' ? msg.mediaUrl : null,
          imageUrl: msg.messageType === 'image' ? msg.mediaUrl : null,
          videoUrl: msg.messageType === 'video' ? msg.mediaUrl : null,
          timestamp: msg.createdAt,
          sender: isFromMe ? 'me' : 'other',
          replyTo: msg.replyTo ? (typeof msg.replyTo === 'object' ? msg.replyTo._id : msg.replyTo) : null,
          replyToMessage: replyToMessage
        };
      });
      
      if (preserveOptimistic) {
        // Keep optimistic messages that haven't been confirmed yet
        setChatMessages(prev => {
          const optimistic = prev.filter(m => m.optimistic);
          return [...formattedMessages, ...optimistic].sort((a, b) => 
            new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
          );
        });
      } else {
        setChatMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      // Don't set empty array on error, keep existing messages
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Get supported MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Use default
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        alert('Recording error occurred. Please try again.');
        stopRecording();
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          console.error('No audio data recorded');
          alert('No audio was recorded. Please try again.');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        if (audioBlob.size === 0) {
          console.error('Empty audio blob');
          alert('Recording was empty. Please try again.');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        sendVoiceNote(audioUrl, audioBlob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      // Start recording with timeslice to ensure data collection
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const sendVoiceNote = async (audioUrl, audioBlob) => {
    if (!chatId) return;
    
    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      type: 'voice',
      audioUrl: audioUrl,
      text: 'Voice note',
      timestamp: new Date().toISOString(),
      sender: 'me',
      optimistic: true,
      replyTo: replyingTo?.id || null
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    // Convert blob to base64 for now (in production, upload to Cloudinary)
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Voice note',
          messageType: 'voice',
          mediaUrl: reader.result,
          replyTo: replyingTo?.id || null
        });
        
        // Remove optimistic message and reload
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        await loadChatMessages(chatId, true);
        setReplyingTo(null);
      } catch (error) {
        console.error('Error sending voice note:', error);
        // Remove optimistic message on error
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        alert('Failed to send voice note');
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !chatId) return;
    
    const messageText = inputText.trim();
    const replyToId = replyingTo?.id || null;
    
    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      type: 'text',
      text: messageText,
      timestamp: new Date().toISOString(),
      sender: 'me',
      optimistic: true,
      replyTo: replyToId,
      replyToMessage: replyingTo || null
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    setReplyingTo(null);
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    try {
      await apiPost('/api/messages/send', {
        toUserId: chatId,
        content: messageText,
        messageType: 'text',
        replyTo: replyToId
      });
      
      // Remove optimistic message and reload
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      await loadChatMessages(chatId, true);
      // Reload conversations to update preview
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      alert('Failed to send message');
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }
    
    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      type: 'image',
      imageUrl: URL.createObjectURL(file),
      text: 'Image',
      timestamp: new Date().toISOString(),
      sender: 'me',
      optimistic: true,
      replyTo: replyingTo?.id || null
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setShowMediaOptions(false);
    setReplyingTo(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Image',
          messageType: 'image',
          mediaUrl: reader.result,
          replyTo: optimisticMessage.replyTo
        });
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        await loadChatMessages(chatId, true);
      } catch (error) {
        console.error('Error sending image:', error);
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        alert('Failed to send image');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !chatId) return;
    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Video size must be less than 50MB');
      return;
    }
    
    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      type: 'video',
      videoUrl: URL.createObjectURL(file),
      text: 'Video',
      timestamp: new Date().toISOString(),
      sender: 'me',
      optimistic: true,
      replyTo: replyingTo?.id || null
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setShowMediaOptions(false);
    setReplyingTo(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Video',
          messageType: 'video',
          mediaUrl: reader.result,
          replyTo: optimisticMessage.replyTo
        });
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        await loadChatMessages(chatId, true);
      } catch (error) {
        console.error('Error sending video:', error);
        setChatMessages(prev => prev.filter(m => m.id !== tempId));
        alert('Failed to send video');
      }
    };
    reader.readAsDataURL(file);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Swipe handlers for mobile
  const handleTouchStart = (e, messageId) => {
    setSwipeData({
      [messageId]: {
        startX: e.touches[0].clientX,
        offset: 0
      }
    });
  };

  const handleTouchMove = (e, messageId) => {
    const swipe = swipeData[messageId];
    if (!swipe) return;
    
    const currentX = e.touches[0].clientX;
    const diff = swipe.startX - currentX;
    
    // Only allow swiping left (to reveal reply)
    if (diff > 0) {
      setSwipeData({
        [messageId]: {
          ...swipe,
          offset: Math.min(diff, 80)
        }
      });
    }
  };

  const handleTouchEnd = (e, messageId) => {
    const swipe = swipeData[messageId];
    if (!swipe) return;
    
    if (swipe.offset > 40) {
      // Swipe threshold reached, set reply
      const message = chatMessages.find(m => m.id === messageId);
      if (message) {
        setReplyingTo(message);
      }
    }
    setSwipeData({});
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setShowMediaOptions(false);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const findReplyToMessage = (replyToId) => {
    return chatMessages.find(m => m.id === replyToId);
  };

  if (!me) {
    return (
      <div className="chats-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (chatId) {
    const chat = messages.find((m) => m.id === chatId);
    return (
      <div className="chat-page">
        <div className="chat-header">
          <button type="button" className="back-btn" onClick={() => router.push('/chats')}>
            ← Back
          </button>
          <h2>{chat?.name || 'Chat'}</h2>
        </div>
        <div className="chat-messages">
          {chatMessages.map((msg) => {
            const replyToMessage = msg.replyToMessage || (msg.replyTo ? findReplyToMessage(msg.replyTo) : null);
            const isOptimistic = msg.optimistic;
            
            return (
              <div
                key={msg.id}
                className={`message ${msg.sender === 'me' ? 'sent' : 'received'} ${isOptimistic ? 'optimistic' : ''}`}
                onTouchStart={(e) => handleTouchStart(e, msg.id)}
                onTouchMove={(e) => handleTouchMove(e, msg.id)}
                onTouchEnd={(e) => handleTouchEnd(e, msg.id)}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                style={{
                  transform: swipeData[msg.id]?.offset > 0 ? `translateX(-${swipeData[msg.id].offset}px)` : 'translateX(0)',
                  transition: !swipeData[msg.id] ? 'transform 0.2s ease-out' : 'none'
                }}
              >
                {hoveredMessageId === msg.id && (
                  <div className="message-menu">
                    <button
                      type="button"
                      className="message-menu-btn"
                      onClick={() => handleReply(msg)}
                      aria-label="Reply"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 0L3 5h3v3h4V5h3L8 0zM0 9v7h16V9h-2v5H2V9H0z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                )}
                {replyToMessage && (
                  <div className="message-reply-preview">
                    <div className="reply-preview-line" />
                    <div className="reply-preview-content">
                      <span className="reply-preview-sender">
                        {replyToMessage.sender === 'me' ? 'You' : chat?.name || 'User'}
                      </span>
                      <span className="reply-preview-text">
                        {replyToMessage.type === 'voice' ? '🎤 Voice note' : 
                         replyToMessage.type === 'image' ? '🖼️ Image' :
                         replyToMessage.type === 'video' ? '🎥 Video' :
                         replyToMessage.text}
                      </span>
                    </div>
                  </div>
                )}
                {msg.type === 'voice' && (
                  <div className="voice-message">
                    <VoiceNotePlayer audioUrl={msg.audioUrl} />
                  </div>
                )}
                {msg.type === 'text' && <p>{msg.text}</p>}
                {msg.type === 'image' && (
                  <div className="image-message">
                    <img src={msg.imageUrl} alt="Shared image" />
                  </div>
                )}
                {msg.type === 'video' && (
                  <div className="video-message">
                    <video controls src={msg.videoUrl}>
                      Your browser does not support video playback.
                    </video>
                  </div>
                )}
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
          {replyingTo && (
            <div className="reply-indicator">
              <div className="reply-indicator-content">
                <span className="reply-indicator-label">Replying to {replyingTo.sender === 'me' ? 'yourself' : chat?.name || 'user'}</span>
                <span className="reply-indicator-text">
                  {replyingTo.type === 'voice' ? '🎤 Voice note' : 
                   replyingTo.type === 'image' ? '🖼️ Image' :
                   replyingTo.type === 'video' ? '🎥 Video' :
                   replyingTo.text}
                </span>
              </div>
              <button type="button" className="reply-cancel-btn" onClick={cancelReply} aria-label="Cancel reply">
                ×
              </button>
            </div>
          )}
          {isRecording && (
            <div className="recording-indicator">
              <span className="recording-dot" /> Recording: {formatTime(recordingTime)}
            </div>
          )}
          <div className="input-row">
            <button 
              type="button" 
              className="media-toggle-btn" 
              onClick={() => setShowMediaOptions(!showMediaOptions)}
            >
              📎
            </button>
            {showMediaOptions && (
              <div className="media-options-popup">
                <button 
                  type="button" 
                  className="media-option" 
                  onClick={() => imageInputRef.current?.click()}
                >
                  <span className="media-icon">🖼️</span>
                  <span>Image</span>
                </button>
                <button 
                  type="button" 
                  className="media-option" 
                  onClick={() => videoInputRef.current?.click()}
                >
                  <span className="media-icon">🎥</span>
                  <span>Video</span>
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button
              type="button"
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              {isRecording ? `${recordingTime}s` : '🎤'}
            </button>
            <button type="button" className="send-btn" onClick={sendMessage} disabled={!inputText.trim()}>
              ➤
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleVideoUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chats-page">
      <div className="page-header">
        <h1>Chats</h1>
      </div>
      {messages.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💬</div>
          <h3>No chats yet</h3>
          <p>When you match with someone, you'll be able to start chatting here!</p>
        </div>
      ) : (
        <div className="chats-list">
          {messages.map((chat) => (
            <div
              key={chat.id}
              className="chat-item"
              onClick={() => router.push(`/chats?id=${chat.id}`)}
            >
              <div className="chat-avatar">{chat.name.charAt(0)}</div>
              <div className="chat-info">
                <h3>{chat.name}</h3>
                <p>{chat.preview}</p>
              </div>
              <span className="chat-time">{chat.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

