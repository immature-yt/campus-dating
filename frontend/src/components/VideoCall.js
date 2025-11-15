import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';

export default function VideoCall({ chatId, otherUserId, onEnd, isIncoming, callerName }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
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
          socket.emit('call:offer', {
            toUserId: otherUserId,
            offer: 'initiate',
            chatId
          });
        }

        // Handle incoming call
        socket.on('call:offer', ({ fromUserId, offer }) => {
          if (fromUserId === otherUserId) {
            // Accept call automatically or show accept/reject UI
          }
        });

        socket.on('call:answer', ({ answer }) => {
          // Handle answer
        });

        socket.on('call:end', () => {
          endCall();
        });
      } catch (error) {
        console.error('Error starting call:', error);
        alert('Failed to start video call. Please check camera/microphone permissions.');
        onEnd();
      }
    };

    startCall();

    return () => {
      endCall();
    };
  }, [chatId, otherUserId, isIncoming]);

  const endCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.emit('call:end', { toUserId: otherUserId });
    }
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

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h3>{isIncoming ? `Incoming call from ${callerName}` : 'Video Call'}</h3>
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

