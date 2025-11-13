import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, isAdmin: user.isAdmin },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name, gender, age, state, city, college, department, bio, prompts } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!name || !gender || !age || !state || !city || !college || !department) {
      return res.status(400).json({ error: 'Name, gender, age, state, city, college, and department are required' });
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const hash = await bcrypt.hash(password, 12);
    const numericAge = Number(age);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash: hash,
      name,
      gender,
      age: Number.isFinite(numericAge) ? numericAge : undefined,
      state,
      city,
      college,
      department,
      bio: bio || '',
      prompts: prompts || [],
      verification_status: 'pending',
      access_level: 'limited'
    });
    const token = signToken(user);
    return res.json({ message: 'Registered successfully', token });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password || '', user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  const user = req.user;
  
  // Return block status if blocked
  if (user.isBlocked) {
    return res.status(403).json({ 
      error: 'Account blocked',
      isBlocked: true,
      blockReason: user.blockReason,
      blockedAt: user.blockedAt
    });
  }
  
  return res.json({
    _id: user._id,
    email: user.email,
    name: user.name,
    gender: user.gender,
    age: user.age,
    state: user.state,
    city: user.city,
    college: user.college,
    department: user.department,
    year: user.year,
    bio: user.bio,
    prompts: user.prompts,
    photos: user.photos,
    id_photo_url: user.id_photo_url,
    selfie_url: user.selfie_url,
    verification_status: user.verification_status,
    access_level: user.access_level,
    admin_note: user.admin_note,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  });
});

export default router;


