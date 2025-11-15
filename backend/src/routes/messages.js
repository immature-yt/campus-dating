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

    // Get all other user IDs
    const otherUserIds = matches.map(match => {
      return match.fromUser._id.toString() === req.user._id.toString() 
        ? match.toUser._id.toString()
        : match.fromUser._id.toString();
    });

    // Batch query: Get last message for each conversation in one query
    const userObjectId = req.user._id;
    const otherUserObjectIds = otherUserIds.map(id => new mongoose.Types.ObjectId(id));
    
    const lastMessages = await Message.aggregate([
      {
        $match: {
          $or: [
            { fromUser: userObjectId, toUser: { $in: otherUserObjectIds } },
            { toUser: userObjectId, fromUser: { $in: otherUserObjectIds } }
          ]
        }
      },
      {
        $addFields: {
          otherUserId: {
            $cond: [
              { $eq: ['$fromUser', userObjectId] },
              '$toUser',
              '$fromUser'
            ]
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$otherUserId',
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    // Batch query: Get unread message count for each conversation
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          toUser: req.user._id,
          isRead: false,
          fromUser: { $in: otherUserIds.map(id => new mongoose.Types.ObjectId(id)) }
        }
      },
      {
        $group: {
          _id: '$fromUser',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const lastMessageMap = new Map();
    lastMessages.forEach(item => {
      lastMessageMap.set(item._id.toString(), item.lastMessage);
    });

    const unreadCountMap = new Map();
    unreadCounts.forEach(item => {
      unreadCountMap.set(item._id.toString(), item.count);
    });

    // Build conversations array
    const conversations = matches.map((match) => {
      const otherUserId = match.fromUser._id.toString() === req.user._id.toString() 
        ? match.toUser._id.toString()
        : match.fromUser._id.toString();
      
      const otherUser = match.fromUser._id.toString() === req.user._id.toString() 
        ? match.toUser 
        : match.fromUser;

      const lastMessageDoc = lastMessageMap.get(otherUserId);
      const unreadCount = unreadCountMap.get(otherUserId) || 0;

      // Check if last message is from current user
      let isFromMe = false;
      if (lastMessageDoc) {
        const fromUserId = lastMessageDoc.fromUser?.toString() || lastMessageDoc.fromUser;
        isFromMe = fromUserId === req.user._id.toString();
      }

      return {
        userId: otherUserId,
        name: otherUser.name,
        email: otherUser.email,
        photos: otherUser.photos,
        verification_status: otherUser.verification_status,
        lastMessage: lastMessageDoc ? {
          content: lastMessageDoc.content,
          messageType: lastMessageDoc.messageType,
          createdAt: lastMessageDoc.createdAt,
          isFromMe: isFromMe
        } : null,
        unreadCount: unreadCount,
        matchedAt: match.updatedAt
      };
    });

    // Deduplicate conversations by userId (keep the one with the most recent lastMessage or matchedAt)
    const conversationMap = new Map();
    conversations.forEach(conv => {
      const existing = conversationMap.get(conv.userId);
      if (!existing) {
        conversationMap.set(conv.userId, conv);
      } else {
        // Keep the conversation with the most recent activity
        const existingTime = existing.lastMessage?.createdAt || existing.matchedAt;
        const currentTime = conv.lastMessage?.createdAt || conv.matchedAt;
        if (new Date(currentTime) > new Date(existingTime)) {
          conversationMap.set(conv.userId, conv);
        }
      }
    });

    const uniqueConversations = Array.from(conversationMap.values());

    return res.json({ conversations: uniqueConversations });
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
      .populate('reactions.userId', 'name')
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

    // Mark messages as delivered and read (non-blocking for better performance)
    // Use Promise.all but don't await - fire and forget for better response time
    Promise.all([
      Message.updateMany(
        { fromUser: userObjectId, toUser: req.user._id, isDelivered: false },
        { isDelivered: true, deliveredAt: new Date() }
      ),
      Message.updateMany(
        { fromUser: userObjectId, toUser: req.user._id, isRead: false },
        { isRead: true, readAt: new Date() }
      )
    ]).catch(err => {
      console.error('Error updating message status:', err);
      // Don't fail the request if status update fails
    });

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
    await message.populate('reactions.userId', 'name');
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

// Add reaction to message
router.post('/:messageId/reaction', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is part of this conversation
    const isParticipant = 
      message.fromUser.toString() === req.user._id.toString() ||
      message.toUser.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== req.user._id.toString()
    );

    // Add new reaction
    message.reactions.push({
      emoji,
      userId: req.user._id
    });

    await message.save();
    await message.populate('reactions.userId', 'name');

    return res.json({ message });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction from message
router.delete('/:messageId/reaction', requireAuth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Remove user's reaction
    message.reactions = message.reactions.filter(
      r => r.userId.toString() !== req.user._id.toString()
    );

    await message.save();
    await message.populate('reactions.userId', 'name');

    return res.json({ message });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

export default router;

