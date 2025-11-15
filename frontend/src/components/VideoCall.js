import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket';
import Peer from 'simple-peer';

export default function VideoCall({ chatId, otherUserId, onEnd, isIncoming, callerName, onAccept, onReject }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callAccepted, setCallAccepted] = useState(!isIncoming);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const pendingOfferRef = useRef(null);

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

        // Create WebRTC peer connection
        const peer = new Peer({
          initiator: !isIncoming,
          trickle: false,
          stream: stream
        });

        peerRef.current = peer;

        peer.on('signal', (data) => {
          // Send signaling data to other user
          if (!isIncoming) {
            // Outgoing call - send as offer
            socket.emit('call:offer', {
              toUserId: otherUserId,
              offer: data,
              chatId
            });
          } else {
            // Incoming call - send as answer
            socket.emit('call:answer', {
              toUserId: otherUserId,
              answer: data,
              chatId
            });
          }
        });

        peer.on('stream', (remoteStream) => {
          // Receive remote video stream
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });

        peer.on('error', (err) => {
          console.error('Peer error:', err);
        });

        peer.on('connect', () => {
          console.log('Peer connection established!');
        });

        // Handle incoming offer (for incoming calls - when accepting)
        if (isIncoming && pendingOfferRef.current) {
          peer.signal(pendingOfferRef.current);
          pendingOfferRef.current = null;
        }

        // Handle incoming answer (for outgoing calls)
        if (!isIncoming) {
          const handleAnswer = ({ fromUserId, answer, chatId: callChatId }) => {
            if (fromUserId === otherUserId && callChatId === chatId && answer && typeof answer === 'object') {
              if (peerRef.current) {
                peerRef.current.signal(answer);
              }
            }
          };
          socket.on('call:answer', handleAnswer);
        }

        socket.on('call:ice-candidate', ({ fromUserId, candidate, chatId: callChatId }) => {
          if (fromUserId === otherUserId && callChatId === chatId && candidate && peerRef.current) {
            peerRef.current.signal(candidate);
          }
        });

        socket.on('call:end', ({ fromUserId, chatId: callChatId }) => {
          if ((fromUserId === otherUserId || !fromUserId) && (!callChatId || callChatId === chatId)) {
            endCall();
          }
        });

      } catch (error) {
        console.error('Error starting call:', error);
        alert('Failed to start video call. Please check camera/microphone permissions.');
        onEnd();
      }
    };

    // Handle incoming offer before call is accepted
    if (isIncoming) {
      const handleIncomingOffer = ({ fromUserId, offer, chatId: callChatId }) => {
        if (fromUserId === otherUserId && callChatId === chatId && offer && typeof offer === 'object') {
          if (callAccepted && peerRef.current) {
            // Call already accepted, signal immediately
            peerRef.current.signal(offer);
          } else {
            // Store offer for when call is accepted
            pendingOfferRef.current = offer;
          }
        }
      };
      socket.on('call:offer', handleIncomingOffer);
    }

    if (callAccepted || !isIncoming) {
      startCall();
    }

    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      socket.off('call:offer');
      socket.off('call:answer');
      socket.off('call:ice-candidate');
      socket.off('call:end');
    };
  }, [chatId, otherUserId, isIncoming, callAccepted]);

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    if (socketRef.current) {
      socketRef.current.emit('call:end', { toUserId: otherUserId, chatId });
    }
    onEnd();
  };

  const acceptCall = async () => {
    setCallAccepted(true);
    if (onAccept) onAccept();
    
    // Start call will be triggered by useEffect when callAccepted changes
    // The peer connection will be created and will send answer signal
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

