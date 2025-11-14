import express from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { Message } from '../models/Message.js';
import { Like } from '../models/Like.js';
import { User } from '../models/User.js';

const router = express.Router();

// Get all conversations (matches) for current user
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    // Find all mutual matches
    const matches = await Like.find({
      $or: [
        { fromUser: req.user._id, status: 'matched' },
        { toUser: req.user._id, status: 'matched' }
      ]
    })
      .populate('fromUser', 'name email photos verification_status')
      .populate('toUser', 'name email photos verification_status')
      .sort({ updatedAt: -1 });

    // Get the other user for each match
    const conversations = await Promise.all(
      matches.map(async (match) => {
        const otherUserId = match.fromUser._id.toString() === req.user._id.toString() 
          ? match.toUser._id 
          : match.fromUser._id;
        
        const otherUser = match.fromUser._id.toString() === req.user._id.toString() 
          ? match.toUser 
          : match.fromUser;

        // Get last message
        const lastMessage = await Message.findOne({
          $or: [
            { fromUser: req.user._id, toUser: otherUserId },
            { fromUser: otherUserId, toUser: req.user._id }
          ]
        }).sort({ createdAt: -1 });

        return {
          userId: otherUserId,
          name: otherUser.name,
          email: otherUser.email,
          photos: otherUser.photos,
          verification_status: otherUser.verification_status,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            messageType: lastMessage.messageType,
            createdAt: lastMessage.createdAt,
            isFromMe: lastMessage.fromUser.toString() === req.user._id.toString()
          } : null,
          matchedAt: match.updatedAt
        };
      })
    );

    return res.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages with a specific user
router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Convert userId to ObjectId
    let userObjectId;
    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid userId format' });
    }

    // Verify they have a match
    const match = await Like.findOne({
      status: 'matched',
      $or: [
        { fromUser: req.user._id, toUser: userObjectId },
        { fromUser: userObjectId, toUser: req.user._id }
      ]
    });

    if (!match) {
      return res.status(403).json({ error: 'No match found with this user' });
    }

    // Get all messages
    const messages = await Message.find({
      $or: [
        { fromUser: req.user._id, toUser: userObjectId },
        { fromUser: userObjectId, toUser: req.user._id }
      ]
    })
      .populate('fromUser', 'name email photos')
      .populate('toUser', 'name email photos')
      .populate({
        path: 'replyTo',
        select: 'content messageType mediaUrl fromUser',
        populate: {
          path: 'fromUser',
          select: 'name'
        }
      })
      .sort({ createdAt: 1 })
      .limit(500);

    // Mark messages as read
    await Message.updateMany(
      { fromUser: userObjectId, toUser: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { toUserId, content, messageType = 'text', mediaUrl, replyTo } = req.body;

    if (!toUserId || !content) {
      return res.status(400).json({ error: 'toUserId and content are required' });
    }

    // Convert toUserId to ObjectId
    let toUserObjectId;
    try {
      toUserObjectId = new mongoose.Types.ObjectId(toUserId);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid toUserId format' });
    }

    // Verify they have a match
    const match = await Like.findOne({
      status: 'matched',
      $or: [
        { fromUser: req.user._id, toUser: toUserObjectId },
        { fromUser: toUserObjectId, toUser: req.user._id }
      ]
    });

    if (!match) {
      return res.status(403).json({ error: 'No match found with this user' });
    }

    // Validate replyTo if provided
    let replyToObjectId = null;
    if (replyTo) {
      try {
        replyToObjectId = new mongoose.Types.ObjectId(replyTo);
        // Verify the replyTo message exists and is in the same conversation
        const replyToMessage = await Message.findOne({
          _id: replyToObjectId,
          $or: [
            { fromUser: req.user._id, toUser: toUserObjectId },
            { fromUser: toUserObjectId, toUser: req.user._id }
          ]
        });
        
        if (!replyToMessage) {
          return res.status(400).json({ error: 'Invalid replyTo message' });
        }
      } catch (error) {
        return res.status(400).json({ error: 'Invalid replyTo format' });
      }
    }

    // Create message
    const message = await Message.create({
      fromUser: req.user._id,
      toUser: toUserObjectId,
      content,
      messageType,
      mediaUrl: mediaUrl || null,
      replyTo: replyToObjectId
    });

    // Populate user info and replyTo before returning
    await message.populate('fromUser', 'name email photos');
    await message.populate('toUser', 'name email photos');
    if (replyToObjectId) {
      await message.populate({
        path: 'replyTo',
        select: 'content messageType mediaUrl fromUser',
        populate: {
          path: 'fromUser',
          select: 'name'
        }
      });
    }

    console.log(`Message sent: fromUser=${req.user._id}, toUser=${toUserObjectId}, replyTo=${replyToObjectId}`);

    return res.json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;

