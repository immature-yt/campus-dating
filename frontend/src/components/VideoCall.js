import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';

export default function VideoCall({ chatId, otherUserId, onEnd, isIncoming, callerName, onAccept, onReject }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callAccepted, setCallAccepted] = useState(!isIncoming);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const startCall = async () => {
      try {
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection (simplified - in production use proper WebRTC)
        if (!isIncoming) {
          // Initiate call
          console.log('Sending call offer:', { toUserId: otherUserId, chatId });
          socket.emit('call:offer', {
            toUserId: otherUserId,
            offer: 'initiate',
            chatId
          });
        }

        // Handle call answer
        socket.on('call:answer', ({ fromUserId, answer }) => {
          if (fromUserId === otherUserId && answer === 'accepted') {
            setCallAccepted(true);
          }
        });

        socket.on('call:end', ({ fromUserId }) => {
          if (fromUserId === otherUserId || !fromUserId) {
            endCall();
          }
        });
      } catch (error) {
        console.error('Error starting call:', error);
        alert('Failed to start video call. Please check camera/microphone permissions.');
        onEnd();
      }
    };

    if (callAccepted || !isIncoming) {
      startCall();
    }

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [chatId, otherUserId, isIncoming, callAccepted]);

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.emit('call:end', { toUserId: otherUserId });
    }
    onEnd();
  };

  const acceptCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('call:answer', {
        toUserId: otherUserId,
        answer: 'accepted'
      });
    }
    setCallAccepted(true);
    if (onAccept) onAccept();
  };

  const rejectCall = () => {
    if (socketRef.current) {
      socketRef.current.emit('call:answer', {
        toUserId: otherUserId,
        answer: 'rejected'
      });
      socketRef.current.emit('call:end', { toUserId: otherUserId });
    }
    if (onReject) onReject();
    onEnd();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Show accept/reject UI for incoming calls
  if (isIncoming && !callAccepted) {
    return (
      <div className="video-call-container">
        <div className="video-call-header">
          <h3>Incoming call from {callerName}</h3>
        </div>
        <div className="video-call-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ fontSize: '4rem' }}>📹</div>
          <h2>{callerName} is calling...</h2>
        </div>
        <div className="video-call-controls">
          <button onClick={rejectCall} className="video-call-btn end-call" style={{ background: 'var(--error)' }}>
            ✕
          </button>
          <button onClick={acceptCall} className="video-call-btn" style={{ background: 'var(--success)', color: 'white', fontSize: '1.5rem' }}>
            ✓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h3>Video Call {callerName ? `with ${callerName}` : ''}</h3>
        <button onClick={endCall} className="video-call-btn end-call">✕</button>
      </div>
      <div className="video-call-content">
        <video ref={remoteVideoRef} className="video-remote" autoPlay playsInline />
        <video ref={localVideoRef} className="video-local" autoPlay playsInline muted />
      </div>
      <div className="video-call-controls">
        <button 
          onClick={toggleMute} 
          className={`video-call-btn mute ${isMuted ? 'active' : ''}`}
        >
          {isMuted ? '🔇' : '🎤'}
        </button>
        <button 
          onClick={toggleVideo} 
          className={`video-call-btn video-toggle ${isVideoOff ? 'active' : ''}`}
        >
          {isVideoOff ? '📷' : '📹'}
        </button>
        <button onClick={endCall} className="video-call-btn end-call">
          📞
        </button>
      </div>
    </div>
  );
}

