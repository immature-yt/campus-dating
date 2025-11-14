import express from 'express';
import { Types } from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/User.js';

const router = express.Router();

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function sampleApprovedUser({ college, excludeId, gender, minAge, maxAge, department, verifiedOnly, excludeIds = [] }) {
  const matchStage = {
    verification_status: 'approved',
    isBlocked: { $ne: true } // Exclude blocked users
  };

  // Only add college filter if college is provided and not null/undefined
  // Use case-insensitive partial match for more flexibility
  if (college && typeof college === 'string') {
    const trimmed = college.trim();
    if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
      matchStage.college = { $regex: new RegExp(escapeRegExp(trimmed), 'i') };
    }
  }
  
  // Exclude specific user IDs
  const idsToExclude = [excludeId, ...excludeIds].filter(id => id && Types.ObjectId.isValid(id));
  if (idsToExclude.length > 0) {
    matchStage._id = { $nin: idsToExclude.map(id => new Types.ObjectId(id)) };
  }
  
  // Also exclude users who have been liked or skipped
  // This will be handled by the excludeIds parameter from frontend
  
  // Gender filter
  if (gender && gender !== '') {
    matchStage.gender = gender;
  }
  
  // Age filter - only apply if explicitly provided (not default values)
  // Don't filter by age if not provided, allowing users without age to show up
  if (minAge || maxAge) {
    const minAgeNum = minAge ? parseInt(minAge) : null;
    const maxAgeNum = maxAge ? parseInt(maxAge) : null;
    
    // Only create age filter if valid numbers are provided
    if ((minAgeNum !== null && !isNaN(minAgeNum) && minAgeNum > 0) || 
        (maxAgeNum !== null && !isNaN(maxAgeNum) && maxAgeNum > 0)) {
      matchStage.age = {};
      if (minAgeNum !== null && !isNaN(minAgeNum) && minAgeNum > 0) {
        matchStage.age.$gte = minAgeNum;
      }
      if (maxAgeNum !== null && !isNaN(maxAgeNum) && maxAgeNum > 0) {
        matchStage.age.$lte = maxAgeNum;
      }
    }
  }
  
  // Department filter
  if (department && department !== '') {
    matchStage.department = { $regex: new RegExp(escapeRegExp(department), 'i') };
  }
  
  // Verified only filter (already set to 'approved' above, but double-check)
  if (verifiedOnly === 'true' || verifiedOnly === true) {
    matchStage.verification_status = 'approved';
  }
  
  console.log('Match query filters:', JSON.stringify(matchStage, null, 2));

  // First, check how many users match the criteria
  const count = await User.countDocuments(matchStage);
  console.log(`Found ${count} users matching criteria`);

  if (count === 0) {
    console.log('No users found matching the criteria');
    return null;
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

  if (match) {
    console.log(`Selected match: ${match._id} - ${match.name} from ${match.college}`);
  } else {
    console.log('No match selected from aggregation');
  }

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
    exclude
  } = req.query;

  // Check if the requesting user is approved
  const requestingUser = await User.findById(req.user._id);
  if (!requestingUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (requestingUser.verification_status !== 'approved') {
    return res.status(403).json({ 
      error: 'Your account must be approved before you can see matches',
      verification_status: requestingUser.verification_status 
    });
  }

  if (!college) {
    return res.status(400).json({ error: 'college query parameter is required' });
  }

  if (!requestingUser.gender) {
    return res.status(400).json({ error: 'Please set your gender in your profile to start matching' });
  }

  // Determine opposite gender automatically
  // Male sees Female, Female sees Male
  // Non-binary and others can see everyone (no gender filter)
  let oppositeGender;
  if (requestingUser.gender === 'male') {
    oppositeGender = 'female';
  } else if (requestingUser.gender === 'female') {
    oppositeGender = 'male';
  } else {
    // Non-binary, other, prefer_not_to_say - no gender filter (see everyone)
    oppositeGender = undefined;
  }

  try {
    const excludeId = req.user?._id;
    const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];
    
    const filters = {
      college,
      excludeId,
      excludeIds,
      gender: oppositeGender, // Automatically filter by opposite gender
      minAge: undefined, // No age filter for college students (18-22)
      maxAge: undefined,
      department: undefined,
      verifiedOnly: undefined
    };
    
    console.log(`Finding match for user ${req.user._id} (gender: ${requestingUser.gender}) looking for: ${oppositeGender || 'all'} in college: ${college}`);
    
    const primaryMatch = await sampleApprovedUser(filters);

    if (primaryMatch) {
      console.log(`Found match: ${primaryMatch._id} from ${primaryMatch.college}`);
      return res.json({ match: formatMatch(primaryMatch) });
    }

    // Try secondary college if provided
    if (secondaryCollege) {
      console.log(`No match in primary college, trying secondary: ${secondaryCollege}`);
      const secondaryMatch = await sampleApprovedUser({
        ...filters,
        college: secondaryCollege
      });
      if (secondaryMatch) {
        console.log(`Found match in secondary college: ${secondaryMatch._id}`);
        return res.json({ match: formatMatch(secondaryMatch), fallback: true });
      }
    }

    // If no matches found, try without college restriction (but still opposite gender)
    console.log('No matches found with college filter, trying broader search without college restriction...');
    const broadMatch = await sampleApprovedUser({
      excludeId,
      excludeIds,
      gender: oppositeGender, // Still filter by opposite gender
      minAge: undefined,
      maxAge: undefined,
      department: undefined,
      verifiedOnly: undefined,
      college: undefined // Remove college restriction
    });

    if (broadMatch) {
      console.log(`Found match without college filter: ${broadMatch._id} from ${broadMatch.college}`);
      return res.json({ match: formatMatch(broadMatch), fallback: true });
    }

    // Check total approved users count for debugging
    const totalApproved = await User.countDocuments({ 
      verification_status: 'approved', 
      isBlocked: { $ne: true } 
    });
    
    // Get list of all approved users for debugging
    const allApprovedUsers = await User.find({
      verification_status: 'approved',
      isBlocked: { $ne: true }
    }).select('_id name college email').limit(10);
    
    const excludedCount = excludeIds.length + (excludeId ? 1 : 0);
    console.log(`Total approved users in database: ${totalApproved}`);
    console.log(`Excluding ${excludedCount} users`);
    console.log(`ExcludeId: ${excludeId}`);
    console.log(`ExcludeIds: ${excludeIds.join(', ')}`);
    console.log(`Sample approved users:`, allApprovedUsers.map(u => ({ id: u._id, name: u.name, college: u.college })));

    console.log('No matches found at all');
    return res.status(404).json({ 
      error: 'No matches found',
      debug: {
        totalApprovedUsers: totalApproved,
        excludedUsers: excludedCount,
        requestedCollege: college,
        excludeId: excludeId?.toString(),
        excludeIds: excludeIds,
        sampleUsers: allApprovedUsers.map(u => ({ id: u._id.toString(), name: u.name, college: u.college }))
      }
    });
  } catch (error) {
    console.error('Match error:', error);
    return res.status(500).json({ error: 'Failed to find match' });
  }
});

export default router;


