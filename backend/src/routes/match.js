import express from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = express.Router();

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function sampleApprovedUser({ college, excludeId, gender, minAge, maxAge, department, verifiedOnly, excludeIds = [] }) {
  const trimmed = college?.trim();
  const matchStage = {
    verification_status: 'approved'
  };

  if (trimmed) {
    matchStage.college = { $regex: new RegExp(`^${escapeRegExp(trimmed)}$`, 'i') };
  }
  
  // Exclude specific user IDs
  const idsToExclude = [excludeId, ...excludeIds].filter(id => id && Types.ObjectId.isValid(id));
  if (idsToExclude.length > 0) {
    matchStage._id = { $nin: idsToExclude.map(id => new Types.ObjectId(id)) };
  }
  
  // Gender filter
  if (gender) {
    matchStage.gender = gender;
  }
  
  // Age filter
  if (minAge || maxAge) {
    matchStage.age = {};
    if (minAge) matchStage.age.$gte = parseInt(minAge);
    if (maxAge) matchStage.age.$lte = parseInt(maxAge);
  }
  
  // Department filter
  if (department) {
    matchStage.department = { $regex: new RegExp(escapeRegExp(department), 'i') };
  }
  
  // Verified only filter
  if (verifiedOnly === 'true' || verifiedOnly === true) {
    matchStage.verification_status = 'approved';
  }

  const [match] = await User.aggregate([
    { $match: matchStage },
    { $sample: { size: 1 } },
    {
      $project: {
        name: 1,
        college: 1,
        bio: 1,
        photos: 1,
        gender: 1,
        age: 1,
        state: 1,
        city: 1,
        department: 1,
        prompts: 1,
        verification_status: 1
      }
    }
  ]);

  return match || null;
}

function formatMatch(user) {
  if (!user) return null;
  const allPhotoUrls = Array.isArray(user.photos)
    ? user.photos.map((photo) => photo.url).filter(Boolean)
    : [];
  const profilePhotos = Array.isArray(user.photos)
    ? user.photos
        .filter((photo) => !photo.kind || photo.kind === 'profile')
        .map((photo) => photo.url)
        .filter(Boolean)
    : [];

  const images = profilePhotos.length > 0 ? profilePhotos : allPhotoUrls;

  return {
    _id: user._id?.toString(),
    name: user.name || 'Campus Crush',
    college: user.college || 'Unknown College',
    gender: user.gender || null,
    age: typeof user.age === 'number' ? user.age : null,
    state: user.state || null,
    city: user.city || null,
    department: user.department || null,
    bio: user.bio || 'Say hi and learn more!',
    images,
    photos: user.photos || [],
    prompts: user.prompts || [],
    verification_status: user.verification_status || 'pending',
    hasImages: images.length > 0
  };
}

router.get('/find', requireAuth, async (req, res) => {
  const { 
    college, 
    secondaryCollege, 
    exclude, 
    gender, 
    minAge, 
    maxAge, 
    department,
    verifiedOnly 
  } = req.query;

  if (!college) {
    return res.status(400).json({ error: 'college query parameter is required' });
  }

  try {
    const excludeId = req.user?._id;
    const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];
    
    const filters = {
      college,
      excludeId,
      excludeIds,
      gender,
      minAge,
      maxAge,
      department,
      verifiedOnly
    };
    
    const primaryMatch = await sampleApprovedUser(filters);

    if (primaryMatch) {
      return res.json({ match: formatMatch(primaryMatch) });
    }

    if (secondaryCollege) {
      const secondaryMatch = await sampleApprovedUser({
        ...filters,
        college: secondaryCollege
      });
      if (secondaryMatch) {
        return res.json({ match: formatMatch(secondaryMatch), fallback: true });
      }
    }

    return res.status(404).json({ error: 'No matches found' });
  } catch (error) {
    console.error('Match error:', error);
    return res.status(500).json({ error: 'Failed to find match' });
  }
});

export default router;


