import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiGet, apiPost } from '../lib/api';

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
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
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

  const loadChatMessages = async (userId) => {
    try {
      const response = await apiGet(`/api/messages/${userId}`);
      const messages = response.messages || [];
      const formattedMessages = messages.map(msg => ({
        id: msg._id,
        type: msg.messageType || 'text',
        text: msg.content,
        audioUrl: msg.messageType === 'voice' ? msg.mediaUrl : null,
        imageUrl: msg.messageType === 'image' ? msg.mediaUrl : null,
        videoUrl: msg.messageType === 'video' ? msg.mediaUrl : null,
        timestamp: msg.createdAt,
        sender: msg.fromUser.toString() === me._id.toString() ? 'me' : 'other'
      }));
      setChatMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      setChatMessages([]);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        sendVoiceNote(audioUrl, audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const sendVoiceNote = async (audioUrl, audioBlob) => {
    if (!chatId) return;
    
    // Convert blob to base64 for now (in production, upload to Cloudinary)
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Voice note',
          messageType: 'voice',
          mediaUrl: reader.result
        });
        // Reload messages
        await loadChatMessages(chatId);
      } catch (error) {
        console.error('Error sending voice note:', error);
        alert('Failed to send voice note');
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !chatId) return;
    
    try {
      await apiPost('/api/messages/send', {
        toUserId: chatId,
        content: inputText,
        messageType: 'text'
      });
      setInputText('');
      // Reload messages
      await loadChatMessages(chatId);
      // Reload conversations to update preview
      await loadConversations();
    } catch (error) {
      console.error('Error sending message:', error);
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
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Image',
          messageType: 'image',
          mediaUrl: reader.result
        });
        await loadChatMessages(chatId);
        setShowMediaOptions(false);
      } catch (error) {
        console.error('Error sending image:', error);
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
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Video',
          messageType: 'video',
          mediaUrl: reader.result
        });
        await loadChatMessages(chatId);
        setShowMediaOptions(false);
      } catch (error) {
        console.error('Error sending video:', error);
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
          {chatMessages.map((msg) => (
            <div key={msg.id} className={`message ${msg.sender === 'me' ? 'sent' : 'received'}`}>
              {msg.type === 'voice' && (
                <div className="voice-message">
                  <audio controls src={msg.audioUrl} />
                  <span className="voice-label">Voice note</span>
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
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input">
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

