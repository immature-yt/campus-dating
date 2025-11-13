import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { Message } from '../models/Message.js';
import { sendEmail } from '../services/email.js';

const router = express.Router();

router.get('/pending', requireAuth, requireAdmin, async (req, res) => {
  const users = await User.find({ verification_status: { $in: ['pending', 'reupload_required'] } })
    .select('_id email name college year id_photo_url selfie_url verification_status createdAt')
    .sort({ createdAt: -1 })
    .limit(100);
  return res.json(users);
});

router.post('/approve', requireAuth, requireAdmin, async (req, res) => {
  const { userId, note } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.verification_status = 'approved';
  user.access_level = 'full';
  user.admin_note = note || '';
  await user.save();
  await AuditLog.create({ userId: user._id, adminId: req.user._id, action: 'approve', note });
  await sendEmail({
    to: user.email,
    subject: 'Campus Dating - Approved',
    html: `<p>Your verification has been approved. Welcome!</p>`
  });
  return res.json({ message: 'Approved' });
});

router.post('/request-reupload', requireAuth, requireAdmin, async (req, res) => {
  const { userId, note } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.verification_status = 'reupload_required';
  user.access_level = 'locked';
  user.admin_note = note || '';
  await user.save();
  await AuditLog.create({
    userId: user._id,
    adminId: req.user._id,
    action: 'request_reupload',
    note
  });
  await sendEmail({
    to: user.email,
    subject: 'Campus Dating - Re-upload Required',
    html: `<p>We need clearer images to verify your account. ${note || ''}</p>`
  });
  return res.json({ message: 'Reupload requested' });
});

router.post('/decline', requireAuth, requireAdmin, async (req, res) => {
  const { userId, note } = req.body;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.verification_status = 'declined';
  user.access_level = 'locked';
  user.admin_note = note || '';
  await user.save();
  await AuditLog.create({ userId: user._id, adminId: req.user._id, action: 'decline', note });
  await sendEmail({
    to: user.email,
    subject: 'Campus Dating - Declined',
    html: `<p>We could not verify your account at this time. ${note || ''}</p>`
  });
  return res.json({ message: 'Declined' });
});

router.get('/audit-log', requireAuth, requireAdmin, async (req, res) => {
  const logs = await AuditLog.find({})
    .populate('userId', 'email')
    .populate('adminId', 'email')
    .sort({ timestamp: -1 })
    .limit(200);
  return res.json(
    logs.map((l) => ({
      id: l._id,
      userEmail: l.userId?.email,
      adminEmail: l.adminId?.email,
      action: l.action,
      note: l.note,
      timestamp: l.timestamp
    }))
  );
});

// Get all users with filters
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { 
      search, 
      verificationStatus, 
      isBlocked, 
      college, 
      page = 1, 
      limit = 50 
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (verificationStatus) {
      query.verification_status = verificationStatus;
    }
    
    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked === 'true';
    }
    
    if (college) {
      query.college = { $regex: college, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [users, total] = await Promise.all([
      User.find(query)
        .select('_id email name college department age gender verification_status isBlocked createdAt updatedAt isAdmin blockedAt blockReason')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    return res.json({
      users,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user details by ID
router.get('/users/:userId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-passwordHash')
      .populate('blockedBy', 'email name');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Block user
router.post('/users/:userId/block', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.isAdmin) {
      return res.status(403).json({ error: 'Cannot block admin users' });
    }
    
    user.isBlocked = true;
    user.blockedAt = new Date();
    user.blockedBy = req.user._id;
    user.blockReason = reason || 'Blocked by admin';
    user.access_level = 'locked';
    await user.save();
    
    await AuditLog.create({
      userId: user._id,
      adminId: req.user._id,
      action: 'block',
      note: reason || ''
    });
    
    await sendEmail({
      to: user.email,
      subject: 'Campus Dating - Account Blocked',
      html: `<p>Your account has been blocked. ${reason || ''}</p><p>Please contact support if you believe this is an error.</p>`
    });
    
    return res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock user
router.post('/users/:userId/unblock', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.isBlocked = false;
    user.blockedAt = null;
    user.blockedBy = null;
    user.blockReason = null;
    user.access_level = user.verification_status === 'approved' ? 'full' : 'limited';
    await user.save();
    
    await AuditLog.create({
      userId: user._id,
      adminId: req.user._id,
      action: 'unblock',
      note: ''
    });
    
    await sendEmail({
      to: user.email,
      subject: 'Campus Dating - Account Unblocked',
      html: `<p>Your account has been unblocked. You can now use the app again.</p>`
    });
    
    return res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Get all chat conversations
router.get('/chats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get all messages with populated user data
    const messages = await Message.find({})
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Message.countDocuments({});
    
    return res.json({
      messages,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return res.status(500).json({ error: 'Failed to fetch chats' });
  }
});

// Get chat between two users
router.get('/chats/:user1Id/:user2Id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    
    const messages = await Message.find({
      $or: [
        { fromUser: user1Id, toUser: user2Id },
        { fromUser: user2Id, toUser: user1Id }
      ]
    })
      .populate('fromUser', 'name email')
      .populate('toUser', 'name email')
      .sort({ createdAt: 1 });
    
    const user1 = await User.findById(user1Id).select('name email');
    const user2 = await User.findById(user2Id).select('name email');
    
    return res.json({
      users: { user1, user2 },
      messages
    });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Get statistics
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      approvedUsers,
      pendingUsers,
      blockedUsers,
      totalMessages
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ verification_status: 'approved' }),
      User.countDocuments({ verification_status: 'pending' }),
      User.countDocuments({ isBlocked: true }),
      Message.countDocuments({})
    ]);
    
    return res.json({
      totalUsers,
      approvedUsers,
      pendingUsers,
      blockedUsers,
      totalMessages
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;


