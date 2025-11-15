import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { connectDb } from './db.js';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import matchRoutes from './routes/match.js';
import likesRoutes from './routes/likes.js';
import messagesRoutes from './routes/messages.js';
import gameRoutes from './routes/game.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { User } from './models/User.js';
import bcrypt from 'bcryptjs';
import { initializeSocket } from './socket.js';

async function bootstrap() {
  await connectDb();

  // Seed admin on boot if env provided and not already admin
  if (config.adminEmail && config.adminPassword) {
    const adminEmail = config.adminEmail.toLowerCase();
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const hash = await bcrypt.hash(config.adminPassword, 12);
      await User.create({
        email: adminEmail,
        passwordHash: hash,
        isAdmin: true,
        verification_status: 'approved',
        access_level: 'full'
      });
      // eslint-disable-next-line no-console
      console.log('Seeded admin user:', adminEmail);
    } else if (!existing.isAdmin) {
      existing.isAdmin = true;
      await existing.save();
      // eslint-disable-next-line no-console
      console.log('Updated existing user to admin:', adminEmail);
    }
  }

  const app = express();
  const server = createServer(app);
  
  // Initialize Socket.IO
  const io = initializeSocket(server);
  
  // Make io available to routes if needed
  app.set('io', io);
  
  // Root route - helpful info
  app.get('/', (req, res) => {
    res.json({
      message: 'Campus Dating API',
      status: 'running',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth/login, /api/auth/register',
        docs: 'This is an API backend. Visit /api/health to check server status.'
      },
      timestamp: new Date().toISOString()
    });
  });
  
  // Health check - place BEFORE helmet and cors for reliability
  app.get('/api/health', (req, res) => {
    console.log('Health check hit');
    res.json({ ok: true, status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.use(helmet());
  
  // CORS configuration - handle origins with/without trailing slashes
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      
      // Normalize origin (remove trailing slash)
      const normalizedOrigin = origin.replace(/\/+$/, '');
      const normalizedFrontendUrl = (config.frontendUrl || '').replace(/\/+$/, '');
      
      // Allow exact match or wildcard
      if (normalizedOrigin === normalizedFrontendUrl || config.frontendUrl === '*') {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
  
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/match', matchRoutes);
  app.use('/api/likes', likesRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/game', gameRoutes);

  app.use(notFound);
  app.use(errorHandler);

  const port = config.port || process.env.PORT || 5000;
  server.listen(port, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on port ${port}`);
    console.log(`Health endpoint: http://0.0.0.0:${port}/api/health`);
    console.log(`Frontend URL: ${config.frontendUrl || 'Not set'}`);
    console.log(`WebSocket server initialized`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during startup:', e);
  process.exit(1);
});


