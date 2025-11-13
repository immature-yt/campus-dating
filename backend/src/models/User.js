import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    kind: { type: String, enum: ['profile', 'id', 'selfie'], required: true }
  },
  { _id: false }
);

const PromptSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true },
    answer: { type: String, required: true }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    gender: {
      type: String,
      enum: ['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'],
      required: false
    },
    age: { type: Number, min: 18, max: 120 },
    college: { type: String },
    state: { type: String },
    city: { type: String },
    department: { type: String },
    year: { type: String },
    bio: { type: String },
    prompts: [PromptSchema],
    photos: [PhotoSchema],
    id_photo_url: { type: String },
    id_photo_public_id: { type: String },
    selfie_url: { type: String },
    selfie_public_id: { type: String },
    verification_status: {
      type: String,
      enum: ['pending', 'reupload_required', 'approved', 'declined'],
      default: 'pending',
      index: true
    },
    access_level: {
      type: String,
      enum: ['limited', 'full', 'locked'],
      default: 'limited',
      index: true
    },
    admin_note: { type: String },
    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    blockedAt: { type: Date },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    blockReason: { type: String }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', UserSchema);


