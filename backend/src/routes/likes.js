import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { Like } from '../models/Like.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

const router = express.Router();

// Send a like
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { toUserId } = req.body;

    if (!toUserId) {
      return res.status(400).json({ error: 'toUserId is required' });
    }

    // Convert toUserId to ObjectId
    let toUserObjectId;
    try {
      toUserObjectId = new mongoose.Types.ObjectId(toUserId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid toUserId format' });
    }

    if (toUserObjectId.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot like yourself' });
    }

    // Check if already liked
    const existingLike = await Like.findOne({
      fromUser: req.user._id,
      toUser: toUserObjectId
    });

    if (existingLike) {
      return res.json({ 
        message: 'Already liked', 
        isMatch: existingLike.status === 'matched' 
      });
    }

    // Check if the other user already liked this user
    const reciprocalLike = await Like.findOne({
      fromUser: toUserObjectId,
      toUser: req.user._id
    });

    // Create the like
    const like = await Like.create({
      fromUser: req.user._id,
      toUser: toUserObjectId,
      status: reciprocalLike ? 'matched' : 'pending'
    });

    // If reciprocal like exists, update it to matched
    if (reciprocalLike) {
      reciprocalLike.status = 'matched';
      await reciprocalLike.save();

      // Log the match
      await AuditLog.create({
        userId: req.user._id,
        adminId: null,
        action: 'match_created',
        note: `Matched with user ${toUserObjectId}`
      });

      return res.json({ 
        message: 'It\'s a match!', 
        isMatch: true,
        matchedUser: await User.findById(toUserObjectId).select('name email photos verification_status')
      });
    }

    return res.json({ 
      message: 'Like sent', 
      isMatch: false 
    });
  } catch (error) {
    console.error('Error sending like:', error);
    return res.status(500).json({ error: 'Failed to send like' });
  }
});

// Get likes sent by current user
router.get('/sent', requireAuth, async (req, res) => {
  try {
    const likes = await Like.find({
      fromUser: req.user._id
    })
      .populate('toUser', 'name email age gender college department photos verification_status')
      .sort({ createdAt: -1 });

    return res.json({ likes });
  } catch (error) {
    console.error('Error fetching sent likes:', error);
    return res.status(500).json({ error: 'Failed to fetch sent likes' });
  }
});

// Get likes received by current user (people who liked you)
router.get('/received', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find likes where current user is the recipient and status is pending
    const likes = await Like.find({
      toUser: userId,
      status: 'pending'
    })
      .populate('fromUser', 'name email age gender college department photos verification_status')
      .sort({ createdAt: -1 });

    console.log(`Found ${likes.length} received likes for user ${userId}`);
    
    return res.json({ likes });
  } catch (error) {
    console.error('Error fetching received likes:', error);
    return res.status(500).json({ error: 'Failed to fetch received likes' });
  }
});

// Get matches (mutual likes)
router.get('/matches', requireAuth, async (req, res) => {
  try {
    const matches = await Like.find({
      status: 'matched',
      $or: [
        { fromUser: req.user._id },
        { toUser: req.user._id }
      ]
    })
      .populate('fromUser', 'name email age gender college department photos verification_status')
      .populate('toUser', 'name email age gender college department photos verification_status')
      .sort({ updatedAt: -1 });

    // Extract the other user from each match
    const matchedUsers = matches.map(match => {
      const otherUser = match.fromUser._id.toString() === req.user._id.toString() 
        ? match.toUser 
        : match.fromUser;
      
      return {
        ...otherUser.toObject(),
        matchedAt: match.updatedAt
      };
    });

    return res.json({ matches: matchedUsers });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// Like someone back (who already liked you)
router.post('/like-back', requireAuth, async (req, res) => {
  try {
    const { fromUserId } = req.body;

    // Find the like from them to you
    const theirLike = await Like.findOne({
      fromUser: fromUserId,
      toUser: req.user._id,
      status: 'pending'
    });

    if (!theirLike) {
      return res.status(404).json({ error: 'Like not found' });
    }

    // Update to matched
    theirLike.status = 'matched';
    await theirLike.save();

    // Create or update your like to them
    const yourLike = await Like.findOneAndUpdate(
      { fromUser: req.user._id, toUser: fromUserId },
      { fromUser: req.user._id, toUser: fromUserId, status: 'matched' },
      { upsert: true, new: true }
    );

    // Log the match
    await AuditLog.create({
      userId: req.user._id,
      adminId: null,
      action: 'match_created',
      note: `Matched with user ${fromUserId}`
    });

    return res.json({ 
      message: 'It\'s a match!', 
      isMatch: true,
      matchedUser: await User.findById(fromUserId).select('name email photos verification_status')
    });
  } catch (error) {
    console.error('Error liking back:', error);
    return res.status(500).json({ error: 'Failed to like back' });
  }
});

// Pass on someone who liked you
router.post('/pass', requireAuth, async (req, res) => {
  try {
    const { fromUserId } = req.body;

    // Find and update the like
    await Like.findOneAndUpdate(
      { fromUser: fromUserId, toUser: req.user._id, status: 'pending' },
      { status: 'rejected' }
    );

    return res.json({ message: 'Passed' });
  } catch (error) {
    console.error('Error passing:', error);
    return res.status(500).json({ error: 'Failed to pass' });
  }
});

export default router;

