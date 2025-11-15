import { io } from 'socket.io-client';
import { getAuthToken, BACKEND_URL } from './api';

let socket = null;

export function getSocket() {
  if (!socket) {
    const token = getAuthToken();
    
    socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

