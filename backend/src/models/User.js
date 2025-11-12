import mongoose from 'mongoose';

const PhotoSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    kind: { type: String, enum: ['profile', 'id', 'selfie'], required: true }
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String },
    college: { type: String },
    year: { type: String },
    bio: { type: String },
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
    isAdmin: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', UserSchema);


