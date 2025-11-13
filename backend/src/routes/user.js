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
    const { bio } = req.body;
    // Only bio can be updated after registration
    // All other fields (name, gender, age, state, city, college) are immutable
    req.user.bio = bio || '';
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
  '/upload-photos',
  requireAuth,
  uploadLimiter,
  upload.fields([
    { name: 'id_photo', maxCount: 1 },
    { name: 'selfie_photo', maxCount: 1 },
    { name: 'profile_photo_0', maxCount: 1 },
    { name: 'profile_photo_1', maxCount: 1 },
    { name: 'profile_photo_2', maxCount: 1 }
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
      
      // Upload all 3 profile photos
      const profilePhotos = [];
      for (let i = 0; i < 3; i++) {
        const photoFile = req.files[`profile_photo_${i}`]?.[0];
        if (photoFile) {
          const profileUpload = await uploadBufferToCloudinary(photoFile.buffer, folder);
          profilePhotos.push({
            url: profileUpload.secure_url,
            publicId: profileUpload.public_id,
            kind: 'profile'
          });
        }
      }
      req.user.photos = profilePhotos;
      
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

// Keep the old endpoint for backward compatibility (upload page)
router.post(
  '/update-profile-photos',
  requireAuth,
  uploadLimiter,
  upload.fields([
    { name: 'profile_photo_0', maxCount: 1 },
    { name: 'profile_photo_1', maxCount: 1 },
    { name: 'profile_photo_2', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const folder = `campus-dating/${req.user._id}`;
      const profilePhotos = [];
      
      // Upload new profile photos
      for (let i = 0; i < 3; i++) {
        const photoFile = req.files[`profile_photo_${i}`]?.[0];
        if (photoFile) {
          const profileUpload = await uploadBufferToCloudinary(photoFile.buffer, folder);
          profilePhotos.push({
            url: profileUpload.secure_url,
            publicId: profileUpload.public_id,
            kind: 'profile'
          });
        } else if (req.user.photos[i]) {
          // Keep existing photo if no new one uploaded
          profilePhotos.push(req.user.photos[i]);
        }
      }
      
      req.user.photos = profilePhotos;
      await req.user.save();
      return res.json({ message: 'Profile photos updated successfully' });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
  }
);

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

// Delete account
router.post('/delete-account', requireAuth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Delete user's photos from Cloudinary
    const user = await User.findById(userId);
    if (user) {
      // Delete profile photos
      if (user.photos && user.photos.length > 0) {
        for (const photo of user.photos) {
          if (photo.publicId) {
            try {
              await cloudinary.uploader.destroy(photo.publicId);
            } catch (err) {
              console.error('Failed to delete photo from Cloudinary:', err);
            }
          }
        }
      }
      
      // Delete ID photo and selfie
      if (user.id_photo_public_id) {
        try {
          await cloudinary.uploader.destroy(user.id_photo_public_id);
        } catch (err) {
          console.error('Failed to delete ID photo from Cloudinary:', err);
        }
      }
      if (user.selfie_public_id) {
        try {
          await cloudinary.uploader.destroy(user.selfie_public_id);
        } catch (err) {
          console.error('Failed to delete selfie from Cloudinary:', err);
        }
      }
    }
    
    // Delete user document
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

export default router;


