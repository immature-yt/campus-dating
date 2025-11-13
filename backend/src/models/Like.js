import mongoose from 'mongoose';

const LikeSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { 
      type: String, 
      enum: ['pending', 'matched', 'rejected'], 
      default: 'pending',
      index: true 
    }
  },
  { timestamps: true }
);

// Compound index for efficient queries
LikeSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });
LikeSchema.index({ toUser: 1, status: 1 });

export const Like = mongoose.model('Like', LikeSchema);

