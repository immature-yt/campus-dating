import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { User } from './models/User.js';

// Store typing indicators: { userId: { typingIn: chatId, timestamp } }
const typingUsers = new Map();

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: config.frontendUrl || '*',
      methods: ['GET', 'POST'],
      credentials: false
    }
  });

  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(decoded.userId).select('_id name email');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Handle typing indicator
    socket.on('typing:start', ({ chatId }) => {
      typingUsers.set(socket.userId, {
        typingIn: chatId,
        timestamp: Date.now()
      });
      
      // Notify the other user in the chat
      socket.to(`chat:${chatId}`).emit('typing:start', {
        userId: socket.userId,
        userName: socket.user.name
      });
    });

    socket.on('typing:stop', ({ chatId }) => {
      typingUsers.delete(socket.userId);
      socket.to(`chat:${chatId}`).emit('typing:stop', {
        userId: socket.userId
      });
    });

    // Join chat room
    socket.on('chat:join', ({ chatId }) => {
      socket.join(`chat:${chatId}`);
    });

    // Leave chat room
    socket.on('chat:leave', ({ chatId }) => {
      socket.leave(`chat:${chatId}`);
      typingUsers.delete(socket.userId);
    });

    // Video call signaling
    socket.on('call:offer', ({ toUserId, offer, chatId }) => {
      // Emit to both user room and chat room to ensure delivery
      socket.to(`user:${toUserId}`).emit('call:offer', {
        fromUserId: socket.userId,
        fromUserName: socket.user.name,
        offer,
        chatId
      });
      socket.to(`chat:${chatId}`).emit('call:offer', {
        fromUserId: socket.userId,
        fromUserName: socket.user.name,
        offer,
        chatId
      });
    });

    socket.on('call:answer', ({ toUserId, answer }) => {
      socket.to(`user:${toUserId}`).emit('call:answer', {
        fromUserId: socket.userId,
        answer
      });
    });

    socket.on('call:ice-candidate', ({ toUserId, candidate }) => {
      socket.to(`user:${toUserId}`).emit('call:ice-candidate', {
        fromUserId: socket.userId,
        candidate
      });
    });

    socket.on('call:end', ({ toUserId }) => {
      socket.to(`user:${toUserId}`).emit('call:end', {
        fromUserId: socket.userId
      });
    });

    // Game events
    socket.on('game:start', ({ toUserId, gameType, question }) => {
      socket.to(`user:${toUserId}`).emit('game:start', {
        fromUserId: socket.userId,
        fromUserName: socket.user.name,
        gameType,
        question
      });
      // Also emit to chat room
      socket.to(`chat:${toUserId}`).emit('game:start', {
        fromUserId: socket.userId,
        fromUserName: socket.user.name,
        gameType,
        question
      });
    });

    socket.on('game:response', ({ toUserId, gameId, response }) => {
      socket.to(`user:${toUserId}`).emit('game:response', {
        fromUserId: socket.userId,
        gameId,
        response
      });
      // Also emit to chat room
      socket.to(`chat:${toUserId}`).emit('game:response', {
        fromUserId: socket.userId,
        gameId,
        response
      });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      typingUsers.delete(socket.userId);
    });
  });

  return io;
}

