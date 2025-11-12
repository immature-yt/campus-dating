import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
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

export default router;


