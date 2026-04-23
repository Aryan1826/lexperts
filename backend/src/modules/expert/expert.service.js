// src/modules/expert/expert.service.js

const Expert = require('./expert.model');
const User = require('../user/user.model');
const Booking = require('../booking/booking.model');
const AppError = require('../../utils/AppError');

// ─── Time helpers ─────────────────────────────────────────────────────────────

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

/**
 * Generate all 30-minute slots within the expert's availability window for a
 * given day, then remove any slots that overlap with existing bookings.
 */
const buildAvailableSlots = (expert, date, existingBookings) => {
  // Use noon to avoid daylight-saving timezone issues
  const dayName = new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

  const dayAvailability = expert.availability?.find((a) => a.day === dayName);
  if (!dayAvailability || dayAvailability.slots.length === 0) return [];

  // Generate every 30-min chunk inside each availability window
  const allSlots = [];
  for (const window of dayAvailability.slots) {
    let current = timeToMinutes(window.start);
    const windowEnd = timeToMinutes(window.end);
    while (current + 30 <= windowEnd) {
      allSlots.push({ start: minutesToTime(current), end: minutesToTime(current + 30) });
      current += 30;
    }
  }

  // Drop any slot that overlaps an existing booking
  return allSlots.filter((slot) => {
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);
    return !existingBookings.some((booking) => {
      const bookedStart = timeToMinutes(booking.slot.start);
      const bookedEnd = timeToMinutes(booking.slot.end);
      return slotStart < bookedEnd && slotEnd > bookedStart;
    });
  });
};

// ─── Service functions ────────────────────────────────────────────────────────

const createProfile = async (userId, profileData) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'expert') throw new AppError('Only users with expert role can create an expert profile', 403);

  const existing = await Expert.findOne({ userId });
  if (existing) throw new AppError('Expert profile already exists for this user', 409);

  const expert = await Expert.create({ userId, ...profileData });
  return expert.populate('userId', 'name email');
};

/**
 * Returns only approved + verified experts visible to clients.
 */
const getAllExperts = async (query) => {
  const { specialization, minFee, maxFee, minRating, sort, page = 1, limit = 10 } = query;

  // Only clients see verified/approved experts
  const filter = { verificationStatus: 'approved', isVerified: true };

  if (specialization) {
    filter.specialization = { $in: specialization.split(',').map((s) => new RegExp(s.trim(), 'i')) };
  }
  if (minFee || maxFee) {
    filter.consultationFee = {};
    if (minFee) filter.consultationFee.$gte = Number(minFee);
    if (maxFee) filter.consultationFee.$lte = Number(maxFee);
  }
  if (minRating) {
    filter.rating = { $gte: Number(minRating) };
  }

  const sortOptions = {
    rating:    { rating: -1 },
    fee_asc:   { consultationFee: 1 },
    fee_desc:  { consultationFee: -1 },
    experience:{ experience: -1 },
  };
  const sortBy = sortOptions[sort] || { createdAt: -1 };

  const pageNum  = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip     = (pageNum - 1) * limitNum;

  const [experts, total] = await Promise.all([
    Expert.find(filter)
      .populate('userId', 'name email')
      .sort(sortBy)
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Expert.countDocuments(filter),
  ]);

  return {
    experts,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  };
};

const getExpertById = async (id) => {
  const expert = await Expert.findById(id).populate('userId', 'name email');
  if (!expert) throw new AppError('Expert not found', 404);
  return expert;
};

const getExpertByUserId = async (userId) => {
  const expert = await Expert.findOne({ userId }).populate('userId', 'name email');
  if (!expert) throw new AppError('Expert profile not found', 404);
  return expert;
};

const updateProfile = async (expertId, userId, updateData) => {
  const expert = await Expert.findById(expertId);
  if (!expert) throw new AppError('Expert not found', 404);

  if (expert.userId.toString() !== userId.toString()) {
    throw new AppError('You are not authorized to update this profile', 403);
  }

  const restrictedFields = ['userId', 'rating', 'totalReviews', 'isVerified', 'verificationStatus', 'sanadDocument'];
  restrictedFields.forEach((field) => delete updateData[field]);

  const updated = await Expert.findByIdAndUpdate(
    expertId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('userId', 'name email');

  return updated;
};

/**
 * Save the uploaded Sanad file path to the expert's profile.
 * Resets verificationStatus to 'pending' so admin must re-review.
 */
const uploadSanad = async (userId, filePath) => {
  const expert = await Expert.findOneAndUpdate(
    { userId },
    {
      $set: {
        sanadDocument: filePath,
        verificationStatus: 'pending',
        isVerified: false,
      },
    },
    { new: true }
  ).populate('userId', 'name email');

  if (!expert) throw new AppError('Expert profile not found. Create your profile first.', 404);
  return expert;
};

/**
 * Return the list of available 30-minute slots for an expert on a given date.
 * Slots that overlap with pending/confirmed bookings are excluded.
 */
const getAvailableSlots = async (expertId, date) => {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new AppError('Date is required in YYYY-MM-DD format', 400);
  }

  const expert = await Expert.findById(expertId).lean();
  if (!expert) throw new AppError('Expert not found', 404);

  // Fetch all active bookings for this expert on this date
  const existingBookings = await Booking.find({
    expertId: expert._id,
    date,
    status: { $in: ['pending', 'confirmed'] },
  })
    .select('slot')
    .lean();

  const slots = buildAvailableSlots(expert, date, existingBookings);
  return slots;
};

module.exports = {
  createProfile,
  getAllExperts,
  getExpertById,
  getExpertByUserId,
  updateProfile,
  uploadSanad,
  getAvailableSlots,
};
