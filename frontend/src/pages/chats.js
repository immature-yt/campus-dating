import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { getSocket } from '../lib/socket';
import VideoCall from '../components/VideoCall';

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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const lastMessageSentRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

  // Setup global socket listeners (not dependent on chatId)
  useEffect(() => {
    if (me) {
      const socket = getSocket();
      socketRef.current = socket;

      // Handle incoming video call - listen globally for all calls
      const handleIncomingCall = ({ fromUserId, fromUserName, offer, chatId: callChatId }) => {
        console.log('Incoming call received:', { fromUserId, fromUserName, callChatId, myId: me._id, offerType: typeof offer });
        // Only show call UI on initial offer (when offer is WebRTC signaling object, not string)
        // If offer is an object, it's WebRTC signaling - show the call UI
        if (offer && typeof offer === 'object' && !showVideoCall) {
          setShowVideoCall(true);
          setIncomingCallData({ fromUserId, fromUserName, chatId: callChatId });
        } else if (offer === 'initiate' && !showVideoCall) {
          // Legacy string-based offer
          setShowVideoCall(true);
          setIncomingCallData({ fromUserId, fromUserName, chatId: callChatId });
        }
      };

      socket.on('call:offer', handleIncomingCall);

      return () => {
        socket.off('call:offer', handleIncomingCall);
      };
    }
  }, [me]); // Only depend on me, not chatId

  // Setup chat-specific socket listeners
  useEffect(() => {
    if (me && chatId) {
      const socket = getSocket();
      socketRef.current = socket;

      // Join chat room when chatId is available
      socket.emit('chat:join', { chatId });

      // Handle typing indicators
      socket.on('typing:start', ({ userId, userName }) => {
        if (userId !== me._id && userId === chatId) {
          setIsTyping(true);
        }
      });

      socket.on('typing:stop', ({ userId }) => {
        if (userId !== me._id && userId === chatId) {
          setIsTyping(false);
        }
      });

      // Handle game start
      socket.on('game:start', ({ fromUserId, gameType }) => {
        if (fromUserId === chatId) {
          // Don't show modal, will be handled as system message
        }
      });

      return () => {
        socket.emit('chat:leave', { chatId });
        socket.off('typing:start');
        socket.off('typing:stop');
        socket.off('game:start');
      };
    }
  }, [me, chatId]);

  // Load messages for specific chat
  useEffect(() => {
    if (chatId && me) {
      loadChatMessages(chatId);
      // Reload conversations to clear unread count when opening a chat
      loadConversations();
      // Set up auto-refresh every 3 seconds (only refresh, don't show loading state)
      const interval = setInterval(() => {
        // Skip auto-refresh if we just sent a message (within last 2 seconds)
        const timeSinceLastMessage = lastMessageSentRef.current 
          ? Date.now() - lastMessageSentRef.current 
          : Infinity;
        if (timeSinceLastMessage > 2000) {
          loadChatMessages(chatId, true, false); // Preserve optimistic messages during refresh, don't show loading
          // Also refresh conversations to update unread counts
          loadConversations();
        }
      }, 3000);
      return () => clearInterval(interval);
    } else {
      // Clear messages when leaving a chat
      setChatMessages([]);
      setMessagesError(null);
      lastMessageSentRef.current = null;
      setIsTyping(false);
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
        photos: conv.photos,
        unreadCount: conv.unreadCount || 0
      }));
      
      // Deduplicate by id as a safety measure (in case backend still returns duplicates)
      const uniqueConversations = formattedConversations.reduce((acc, conv) => {
        if (!acc.find(c => c.id === conv.id)) {
          acc.push(conv);
        }
        return acc;
      }, []);
      
      setMessages(uniqueConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to empty array
      setMessages([]);
    }
  };

  const loadChatMessages = async (userId, preserveOptimistic = false, showLoading = true) => {
    try {
      if (!userId || !me) return;
      
      if (showLoading) {
        setIsLoadingMessages(true);
        setMessagesError(null);
      }
      
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
          replyToMessage: replyToMessage,
          isDelivered: msg.isDelivered || false,
          isRead: msg.isRead || false,
          optimistic: false,
          reactions: msg.reactions || []
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
      
      if (showLoading) {
        setIsLoadingMessages(false);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      if (showLoading) {
        setMessagesError('Failed to load messages. Please try again.');
        setIsLoadingMessages(false);
      }
      // Don't set empty array on error, keep existing messages
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const startRecording = async () => {
    try {
      // Stop any existing recording first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Get supported MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Use default
          }
        }
      }
      
      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size, 'bytes');
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
        console.log('Recording stopped. Chunks:', audioChunksRef.current.length);
        const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + (chunk?.size || 0), 0);
        console.log('Total size:', totalSize, 'bytes');
        
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        if (audioChunksRef.current.length === 0 || totalSize === 0) {
          console.error('No audio data recorded');
          alert('No audio was recorded. Please try again.');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          audioChunksRef.current = [];
          return;
        }
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        
        console.log('Blob size:', audioBlob.size, 'bytes', 'Type:', audioBlob.type);
        
        if (audioBlob.size === 0) {
          console.error('Empty audio blob');
          alert('Recording was empty. Please try again.');
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
          audioChunksRef.current = [];
          return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        sendVoiceNote(audioUrl, audioBlob);
        
        // Clean up stream after a delay to ensure blob URL is created
        setTimeout(() => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
          }
        }, 500);
      };

      // Start recording with timeslice to ensure data collection
      // Use a smaller timeslice for more frequent data collection
      if (mediaRecorder.state === 'inactive') {
        mediaRecorder.start(250); // Collect data every 250ms
        console.log('Recording started with MIME type:', mimeType || 'default');
        setIsRecording(true);
        setRecordingTime(0);

        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Microphone access denied. Please enable microphone permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const recorder = mediaRecorderRef.current;
      console.log('Stopping recording. State:', recorder.state, 'Recording time:', recordingTime);
      
      // Don't allow stopping if recording time is less than 0.5 seconds (likely accidental)
      if (recordingTime < 0.5) {
        console.log('Recording too short, cancelling');
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (recorder.state === 'recording' || recorder.state === 'paused') {
          recorder.stop();
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        audioChunksRef.current = [];
        return;
      }
      
      if (recorder.state === 'recording' || recorder.state === 'paused') {
        // Request final data before stopping
        recorder.requestData();
        // Wait a moment to ensure data is collected
        setTimeout(() => {
          recorder.stop();
        }, 100);
      } else {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
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
      replyTo: replyingTo?.id || null,
      isDelivered: false,
      isRead: false
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
      replyToMessage: replyingTo || null,
      isDelivered: false,
      isRead: false
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    setReplyingTo(null);
    lastMessageSentRef.current = Date.now(); // Track when we sent the message
    
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    try {
      const response = await apiPost('/api/messages/send', {
        toUserId: chatId,
        content: messageText,
        messageType: 'text',
        replyTo: replyToId
      });
      
      // Convert the sent message to the same format as other messages
      if (response.message) {
        const msg = response.message;
        const fromUserId = typeof msg.fromUser === 'object' ? msg.fromUser._id : msg.fromUser;
        const fromUserIdStr = fromUserId?.toString();
        const myIdStr = me._id?.toString();
        const isFromMe = fromUserIdStr === myIdStr;
        
        let replyToMessage = null;
        if (msg.replyTo) {
          const replyToMsg = typeof msg.replyTo === 'object' ? msg.replyTo : null;
          if (replyToMsg) {
            const replyFromUserId = typeof replyToMsg.fromUser === 'object' ? replyToMsg.fromUser._id : replyToMsg.fromUser;
            const replyFromUserIdStr = replyFromUserId?.toString();
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
        
        const realMessage = {
          id: msg._id,
          type: msg.messageType || 'text',
          text: msg.content,
          audioUrl: msg.messageType === 'voice' ? msg.mediaUrl : null,
          imageUrl: msg.messageType === 'image' ? msg.mediaUrl : null,
          videoUrl: msg.messageType === 'video' ? msg.mediaUrl : null,
          timestamp: msg.createdAt,
          sender: isFromMe ? 'me' : 'other',
          replyTo: msg.replyTo ? (typeof msg.replyTo === 'object' ? msg.replyTo._id : msg.replyTo) : null,
          replyToMessage: replyToMessage,
          isDelivered: msg.isDelivered || false,
          isRead: msg.isRead || false,
          optimistic: false
        };
        
        // Replace optimistic message with real message - use functional update to avoid race conditions
        setChatMessages(prev => {
          // Check if message already exists (from auto-refresh)
          const existingIndex = prev.findIndex(m => m.id === msg._id);
          if (existingIndex >= 0) {
            // Message already exists, just remove optimistic
            return prev.filter(m => m.id !== tempId);
          }
          // Message doesn't exist yet, replace optimistic with real
          const filtered = prev.filter(m => m.id !== tempId);
          return [...filtered, realMessage].sort((a, b) => 
            new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
          );
        });
      } else {
        // Fallback: reload messages after a short delay to ensure the message is saved
        setTimeout(async () => {
          setChatMessages(prev => prev.filter(m => m.id !== tempId));
          await loadChatMessages(chatId, false);
        }, 300);
      }
      
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
      replyTo: replyingTo?.id || null,
      isDelivered: false,
      isRead: false
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setShowMediaOptions(false);
    setReplyingTo(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Image',
          messageType: 'image',
          mediaUrl: reader.result,
          replyTo: optimisticMessage.replyTo
        });
        
        // Convert the sent message to the same format
        if (response.message) {
          const msg = response.message;
          const fromUserId = typeof msg.fromUser === 'object' ? msg.fromUser._id : msg.fromUser;
          const fromUserIdStr = fromUserId?.toString();
          const myIdStr = me._id?.toString();
          const isFromMe = fromUserIdStr === myIdStr;
          
          let replyToMessage = null;
          if (msg.replyTo) {
            const replyToMsg = typeof msg.replyTo === 'object' ? msg.replyTo : null;
            if (replyToMsg) {
              const replyFromUserId = typeof replyToMsg.fromUser === 'object' ? replyToMsg.fromUser._id : replyToMsg.fromUser;
              const replyFromUserIdStr = replyFromUserId?.toString();
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
          
          const realMessage = {
            id: msg._id,
            type: msg.messageType || 'image',
            text: msg.content,
            audioUrl: msg.messageType === 'voice' ? msg.mediaUrl : null,
            imageUrl: msg.messageType === 'image' ? msg.mediaUrl : null,
            videoUrl: msg.messageType === 'video' ? msg.mediaUrl : null,
            timestamp: msg.createdAt,
            sender: isFromMe ? 'me' : 'other',
            replyTo: msg.replyTo ? (typeof msg.replyTo === 'object' ? msg.replyTo._id : msg.replyTo) : null,
            replyToMessage: replyToMessage,
            isDelivered: msg.isDelivered || false,
            isRead: msg.isRead || false,
            optimistic: false
          };
          
          // Replace optimistic message with real message
          setChatMessages(prev => {
            const filtered = prev.filter(m => m.id !== tempId);
            return [...filtered, realMessage].sort((a, b) => 
              new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
            );
          });
        } else {
          // Fallback: reload messages after a short delay
          setTimeout(async () => {
            setChatMessages(prev => prev.filter(m => m.id !== tempId));
            await loadChatMessages(chatId, false);
          }, 300);
        }
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
      replyTo: replyingTo?.id || null,
      isDelivered: false,
      isRead: false
    };
    
    setChatMessages(prev => [...prev, optimisticMessage]);
    setShowMediaOptions(false);
    setReplyingTo(null);
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const response = await apiPost('/api/messages/send', {
          toUserId: chatId,
          content: 'Video',
          messageType: 'video',
          mediaUrl: reader.result,
          replyTo: optimisticMessage.replyTo
        });
        
        // Convert the sent message to the same format
        if (response.message) {
          const msg = response.message;
          const fromUserId = typeof msg.fromUser === 'object' ? msg.fromUser._id : msg.fromUser;
          const fromUserIdStr = fromUserId?.toString();
          const myIdStr = me._id?.toString();
          const isFromMe = fromUserIdStr === myIdStr;
          
          let replyToMessage = null;
          if (msg.replyTo) {
            const replyToMsg = typeof msg.replyTo === 'object' ? msg.replyTo : null;
            if (replyToMsg) {
              const replyFromUserId = typeof replyToMsg.fromUser === 'object' ? replyToMsg.fromUser._id : replyToMsg.fromUser;
              const replyFromUserIdStr = replyFromUserId?.toString();
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
          
          const realMessage = {
            id: msg._id,
            type: msg.messageType || 'video',
            text: msg.content,
            audioUrl: msg.messageType === 'voice' ? msg.mediaUrl : null,
            imageUrl: msg.messageType === 'image' ? msg.mediaUrl : null,
            videoUrl: msg.messageType === 'video' ? msg.mediaUrl : null,
            timestamp: msg.createdAt,
            sender: isFromMe ? 'me' : 'other',
            replyTo: msg.replyTo ? (typeof msg.replyTo === 'object' ? msg.replyTo._id : msg.replyTo) : null,
            replyToMessage: replyToMessage,
            isDelivered: msg.isDelivered || false,
            isRead: msg.isRead || false,
            optimistic: false
          };
          
          // Replace optimistic message with real message
          setChatMessages(prev => {
            const filtered = prev.filter(m => m.id !== tempId);
            return [...filtered, realMessage].sort((a, b) => 
              new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
            );
          });
        } else {
          // Fallback: reload messages after a short delay
          setTimeout(async () => {
            setChatMessages(prev => prev.filter(m => m.id !== tempId));
            await loadChatMessages(chatId, false);
          }, 300);
        }
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
  const handleTouchStart = (e, messageId, sender) => {
    setSwipeData({
      [messageId]: {
        startX: e.touches[0].clientX,
        offset: 0,
        sender: sender
      }
    });
  };

  const handleTouchMove = (e, messageId) => {
    const swipe = swipeData[messageId];
    if (!swipe) return;
    
    const currentX = e.touches[0].clientX;
    const diff = swipe.startX - currentX;
    
    // For received messages (other), swipe left to right (positive diff = swipe right)
    // For sent messages (me), swipe right to left (negative diff = swipe left)
    if (swipe.sender === 'other') {
      // Swipe from left to right (positive offset)
      if (diff < 0) {
        setSwipeData({
          [messageId]: {
            ...swipe,
            offset: Math.min(Math.abs(diff), 80)
          }
        });
      }
    } else {
      // Swipe from right to left (negative offset, current behavior)
      if (diff > 0) {
        setSwipeData({
          [messageId]: {
            ...swipe,
            offset: Math.min(diff, 80)
          }
        });
      }
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

  // Typing indicator handler
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (chatId && socketRef.current) {
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Emit typing start
      socketRef.current.emit('typing:start', { chatId });
      
      // Set timeout to stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit('typing:stop', { chatId });
        }
      }, 2000);
    }
  };

  // Reaction handlers
  const handleAddReaction = async (messageId, emoji) => {
    try {
      const response = await apiPost(`/api/messages/${messageId}/reaction`, { emoji });
      // Update message in chatMessages
      setChatMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: response.message.reactions } : msg
      ));
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId) => {
    try {
      const response = await apiDelete(`/api/messages/${messageId}/reaction`);
      setChatMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, reactions: response.message.reactions } : msg
      ));
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const getReactionCount = (reactions, emoji) => {
    return reactions?.filter(r => r.emoji === emoji).length || 0;
  };

  const hasUserReacted = (reactions, emoji) => {
    return reactions?.some(r => r.emoji === emoji && r.userId?.toString() === me?._id?.toString());
  };

  // Start Truth/Dare game - sends system message
  const startTruthDareGame = async () => {
    try {
      const response = await apiGet('/api/game/random');
      const gameMessage = {
        id: `game-${Date.now()}`,
        type: 'game',
        gameType: response.type,
        question: response.question,
        sender: 'system',
        timestamp: new Date().toISOString(),
        optimistic: true,
        gameState: 'pending',
        skipsUsed: 0,
        skipsRemaining: 2
      };
      
      // Add to chat messages
      setChatMessages(prev => [...prev, gameMessage]);
      setActiveGame(gameMessage);
      
      // Send via socket to other user
      if (socketRef.current) {
        socketRef.current.emit('game:start', {
          toUserId: chatId,
          gameType: response.type,
          question: response.question
        });
      }
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game');
    }
  };

  // Handle game response (accept/skip)
  const handleGameResponse = async (gameId, response) => {
    const game = chatMessages.find(m => m.id === gameId);
    if (!game || game.sender !== 'system') return;

    if (response === 'skip') {
      const newSkipsUsed = (game.skipsUsed || 0) + 1;
      const newSkipsRemaining = (game.skipsRemaining || 2) - 1;
      
      if (newSkipsRemaining < 0) {
        alert('You have used all your skips for this round!');
        return;
      }

      // Update game state
      setChatMessages(prev => prev.map(msg => 
        msg.id === gameId 
          ? { ...msg, skipsUsed: newSkipsUsed, skipsRemaining: newSkipsRemaining }
          : msg
      ));

      // Get new question
      try {
        const newResponse = await apiGet(`/api/game/${game.gameType}`);
        setChatMessages(prev => prev.map(msg => 
          msg.id === gameId 
            ? { ...msg, question: newResponse.question }
            : msg
        ));
      } catch (error) {
        console.error('Error getting new question:', error);
      }
    } else if (response === 'accept') {
      // Mark as accepted
      setChatMessages(prev => prev.map(msg => 
        msg.id === gameId 
          ? { ...msg, gameState: 'accepted' }
          : msg
      ));
    }

    // Notify other user
    if (socketRef.current) {
      socketRef.current.emit('game:response', {
        toUserId: chatId,
        gameId,
        response
      });
    }
  };

  // Handle incoming game
  useEffect(() => {
    if (me && socketRef.current) {
      const handleGameStart = ({ fromUserId, gameType, question }) => {
        if (fromUserId === chatId) {
          const gameMessage = {
            id: `game-${Date.now()}`,
            type: 'game',
            gameType: gameType,
            question: question,
            sender: 'system',
            timestamp: new Date().toISOString(),
            optimistic: false,
            gameState: 'pending',
            skipsUsed: 0,
            skipsRemaining: 2
          };
          setChatMessages(prev => [...prev, gameMessage]);
          setActiveGame(gameMessage);
          
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
        }
      };

      socketRef.current.on('game:start', handleGameStart);
      return () => {
        socketRef.current?.off('game:start', handleGameStart);
      };
    }
  }, [me, chatId]);

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
    // Handle photos - can be array of objects with url property or array of strings
    let chatPhoto = null;
    if (chat?.photos && chat.photos.length > 0) {
      const firstPhoto = chat.photos[0];
      chatPhoto = typeof firstPhoto === 'string' ? firstPhoto : (firstPhoto?.url || null);
    }
    
    return (
      <div className="chat-page">
        <div className="chat-header">
          <button type="button" className="back-btn" onClick={() => router.push('/chats')}>
            ←
          </button>
          {chatPhoto ? (
            <img src={chatPhoto} alt={chat?.name || 'User'} className="chat-header-avatar" />
          ) : (
            <div className="chat-header-avatar chat-header-avatar-placeholder">
              {chat?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <h2>{chat?.name || 'Chat'}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button 
              type="button" 
              className="back-btn" 
              onClick={() => {
                setShowVideoCall(true);
                setIncomingCallData(null);
              }}
              title="Video Call"
            >
              📹
            </button>
            <button 
              type="button" 
              className="back-btn" 
              onClick={startTruthDareGame}
              title="Truth or Dare"
            >
              🎮
            </button>
          </div>
        </div>
        <div className="chat-messages">
          {isLoadingMessages && chatMessages.length === 0 && (
            <div className="loading-container" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="loading-spinner" />
              <p>Loading messages...</p>
            </div>
          )}
          {messagesError && chatMessages.length === 0 && (
            <div className="error-container" style={{ padding: '2rem', textAlign: 'center', color: 'var(--error)' }}>
              <p>{messagesError}</p>
              <button 
                type="button"
                onClick={() => loadChatMessages(chatId)}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }}
              >
                Retry
              </button>
            </div>
          )}
          {chatMessages.map((msg) => {
            const replyToMessage = msg.replyToMessage || (msg.replyTo ? findReplyToMessage(msg.replyTo) : null);
            const isOptimistic = msg.optimistic;
            const isSystemMessage = msg.sender === 'system';
            
            return (
              <div
                key={msg.id}
                className={`message ${isSystemMessage ? 'system' : (msg.sender === 'me' ? 'sent' : 'received')} ${isOptimistic ? 'optimistic' : ''}`}
                onTouchStart={!isSystemMessage ? (e) => handleTouchStart(e, msg.id, msg.sender) : undefined}
                onTouchMove={!isSystemMessage ? (e) => handleTouchMove(e, msg.id) : undefined}
                onTouchEnd={!isSystemMessage ? (e) => handleTouchEnd(e, msg.id) : undefined}
                onMouseEnter={!isSystemMessage ? () => setHoveredMessageId(msg.id) : undefined}
                onMouseLeave={!isSystemMessage ? () => setHoveredMessageId(null) : undefined}
                style={!isSystemMessage ? {
                  transform: swipeData[msg.id]?.offset > 0 
                    ? (msg.sender === 'other' 
                        ? `translateX(${swipeData[msg.id].offset}px)` 
                        : `translateX(-${swipeData[msg.id].offset}px)`)
                    : 'translateX(0)',
                  transition: !swipeData[msg.id] ? 'transform 0.2s ease-out' : 'none'
                } : {}}
              >
                {!isSystemMessage && (
                  <div 
                    className="message-menu-wrapper"
                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                    onMouseLeave={(e) => {
                      // Only hide if mouse is not moving to the button
                      const relatedTarget = e.relatedTarget;
                      if (!relatedTarget || !relatedTarget.closest('.message-menu-wrapper')) {
                        setHoveredMessageId(null);
                      }
                    }}
                  >
                    {hoveredMessageId === msg.id && (
                      <div className="message-menu">
                        <button
                          type="button"
                          className="message-menu-btn"
                          onClick={() => {
                            handleReply(msg);
                            setHoveredMessageId(null);
                          }}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          aria-label="Reply"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 0L3 5h3v3h4V5h3L8 0zM0 9v7h16V9h-2v5H2V9H0z" fill="currentColor"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="message-menu-btn"
                          onClick={() => {
                            setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id);
                            setHoveredMessageId(null);
                          }}
                          onMouseEnter={() => setHoveredMessageId(msg.id)}
                          aria-label="React"
                        >
                          😊
                        </button>
                      </div>
                    )}
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
                {msg.type === 'game' && (
                  <div className="game-message">
                    <div className={`game-type-badge ${msg.gameType}`}>
                      {msg.gameType === 'truth' ? 'Truth' : 'Dare'}
                    </div>
                    <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem', fontSize: '1rem' }}>{msg.question}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Rules: You can skip up to 2 times per round
                    </div>
                    {msg.gameState !== 'accepted' && (
                      <div className="game-actions" style={{ marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="game-btn accept"
                          onClick={() => handleGameResponse(msg.id, 'accept')}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          className="game-btn skip"
                          onClick={() => handleGameResponse(msg.id, 'skip')}
                          disabled={(msg.skipsRemaining || 2) <= 0}
                          style={{ 
                            padding: '0.5rem 1rem', 
                            fontSize: '0.875rem',
                            opacity: (msg.skipsRemaining || 2) <= 0 ? 0.5 : 1
                          }}
                        >
                          Skip ({(msg.skipsRemaining || 2)} left)
                        </button>
                      </div>
                    )}
                    {msg.gameState === 'accepted' && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--success)', marginTop: '0.5rem', fontWeight: '600' }}>
                        ✓ Accepted
                      </div>
                    )}
                  </div>
                )}
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
                {!isSystemMessage && (
                  <div className="message-time-container">
                    <span className="message-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.sender === 'me' && (
                    <span className="message-status">
                      {msg.optimistic ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="status-icon status-clock">
                          <path d="M6 1C3.24 1 1 3.24 1 6C1 8.76 3.24 11 6 11C8.76 11 11 8.76 11 6C11 3.24 8.76 1 6 1ZM6 10C3.79 10 2 8.21 2 6C2 3.79 3.79 2 6 2C8.21 2 10 3.79 10 6C10 8.21 8.21 10 6 10Z" fill="currentColor"/>
                          <path d="M6.5 3.5V6.5L8.5 8.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                      ) : msg.isRead ? (
                        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="status-icon status-read">
                          <path d="M0 5.5L3.5 9L9.5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6.5 5.5L10 9L16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : msg.isDelivered ? (
                        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" className="status-icon status-delivered">
                          <path d="M0 5.5L3.5 9L9.5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6.5 5.5L10 9L16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="status-icon status-sent">
                          <path d="M1 6L5 10L11 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    )}
                  </div>
                )}
                {/* Message reactions - only for non-system messages */}
                {!isSystemMessage && msg.reactions && msg.reactions.length > 0 && (
                  <div className="message-reactions">
                    {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => {
                      const count = getReactionCount(msg.reactions, emoji);
                      if (count === 0) return null;
                      return (
                        <div
                          key={emoji}
                          className={`reaction-badge ${hasUserReacted(msg.reactions, emoji) ? 'active' : ''}`}
                          onClick={() => hasUserReacted(msg.reactions, emoji) 
                            ? handleRemoveReaction(msg.id) 
                            : handleAddReaction(msg.id, emoji)
                          }
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      className="reaction-badge"
                      onClick={() => setShowReactionPicker(showReactionPicker === msg.id ? null : msg.id)}
                      style={{ fontSize: '0.875rem' }}
                    >
                      +
                    </button>
                  </div>
                )}
                {!isSystemMessage && showReactionPicker === msg.id && (
                  <div className="reaction-picker">
                    {['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          fontSize: '1.5rem', 
                          cursor: 'pointer',
                          padding: '0.25rem'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {/* Typing indicator */}
          {isTyping && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
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
              onChange={handleInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage();
                  // Stop typing indicator
                  if (socketRef.current) {
                    socketRef.current.emit('typing:stop', { chatId });
                  }
                  if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                  }
                }
              }}
            />
            <button
              type="button"
              className={`voice-btn ${isRecording ? 'recording' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                startRecording();
              }}
              onMouseUp={(e) => {
                e.preventDefault();
                stopRecording();
              }}
              onMouseLeave={(e) => {
                if (isRecording) {
                  e.preventDefault();
                  stopRecording();
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                startRecording();
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopRecording();
              }}
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
        {/* Video Call Component */}
        {showVideoCall && (
          <VideoCall
            chatId={chatId || incomingCallData?.chatId}
            otherUserId={incomingCallData?.fromUserId || chatId}
            onEnd={() => {
              setShowVideoCall(false);
              setIncomingCallData(null);
            }}
            isIncoming={!!incomingCallData}
            callerName={incomingCallData?.fromUserName || chat?.name}
            onAccept={() => setIncomingCallData(null)}
            onReject={() => setIncomingCallData(null)}
          />
        )}
      </div>
    );
  }

  // Only render the list if we're not viewing a specific chat
  if (chatId) {
    return null; // This shouldn't happen due to early return above, but just in case
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                <span className="chat-time">{chat.time}</span>
                {chat.unreadCount > 0 && (
                  <span 
                    className="unread-badge"
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      borderRadius: '10px',
                      padding: '0.125rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '20px',
                      textAlign: 'center'
                    }}
                  >
                    {chat.unreadCount > 4 ? '4+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

