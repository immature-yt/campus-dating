import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { connectDb } from './db.js';
import { config } from './config.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { User } from './models/User.js';
import bcrypt from 'bcryptjs';

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
  app.use(helmet());
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: false
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on ${config.port}`);
  });
}

bootstrap().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during startup:', e);
  process.exit(1);
});


