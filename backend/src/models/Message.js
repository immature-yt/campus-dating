import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    messageType: { type: String, enum: ['text', 'voice', 'image', 'video'], default: 'text' },
    mediaUrl: { type: String },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date }
  },
  { timestamps: true }
);

// Compound index for efficient chat queries
MessageSchema.index({ fromUser: 1, toUser: 1, createdAt: -1 });
MessageSchema.index({ toUser: 1, fromUser: 1, createdAt: -1 });

export const Message = mongoose.model('Message', MessageSchema);

