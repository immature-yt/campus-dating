import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { uploadLimiter } from '../middleware/rateLimiters.js';
import { cloudinary } from '../services/cloudinary.js';
import { User } from '../models/User.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxFileSizeBytes },
  fileFilter: (req, file, cb) => {
    if (!config.uploads.allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

router.post('/profile', requireAuth, async (req, res) => {
  try {
    const { name, college, year, bio } = req.body;
    req.user.name = name;
    req.user.college = college;
    req.user.year = year;
    req.user.bio = bio;
    await req.user.save();
    return res.json({ message: 'Profile updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Could not update profile' });
  }
});

async function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

router.post(
  '/upload-id',
  requireAuth,
  uploadLimiter,
  upload.fields([
    { name: 'id_photo', maxCount: 1 },
    { name: 'selfie_photo', maxCount: 1 },
    { name: 'profile_photo', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const idPhotoFile = req.files['id_photo']?.[0];
      const selfieFile = req.files['selfie_photo']?.[0];
      if (!idPhotoFile || !selfieFile) {
        return res.status(400).json({ error: 'id_photo and selfie_photo are required' });
      }
      const folder = `campus-dating/${req.user._id}`;
      const [idUpload, selfieUpload] = await Promise.all([
        uploadBufferToCloudinary(idPhotoFile.buffer, folder),
        uploadBufferToCloudinary(selfieFile.buffer, folder)
      ]);
      req.user.id_photo_url = idUpload.secure_url;
      req.user.id_photo_public_id = idUpload.public_id;
      req.user.selfie_url = selfieUpload.secure_url;
      req.user.selfie_public_id = selfieUpload.public_id;
      if (req.files['profile_photo']?.[0]) {
        const profileUpload = await uploadBufferToCloudinary(
          req.files['profile_photo'][0].buffer,
          folder
        );
        // keep only one optional profile photo in photos[] for MVP simplicity
        req.user.photos = [
          {
            url: profileUpload.secure_url,
            publicId: profileUpload.public_id,
            kind: 'profile'
          }
        ];
      }
      // When uploaded, set back to pending and limited access
      req.user.verification_status = 'pending';
      req.user.access_level = 'limited';
      req.user.admin_note = undefined;
      await req.user.save();
      return res.json({ message: 'Uploaded. Awaiting review.' });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
  }
);

export default router;


