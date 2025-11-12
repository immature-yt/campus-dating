import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, enum: ['approve', 'request_reupload', 'decline'], required: true },
    note: { type: String }
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } }
);

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);


