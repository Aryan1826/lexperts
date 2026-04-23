// src/modules/admin/admin.service.js

const User = require('../user/user.model');
const Expert = require('../expert/expert.model');
const Booking = require('../booking/booking.model');
const AppError = require('../../utils/AppError');

/**
 * Get platform-wide stats for the admin dashboard.
 */
const getStats = async () => {
  const [
    totalUsers,
    totalExperts,
    totalBookings,
    pendingExperts,
    confirmedBookings,
    cancelledBookings,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    Expert.countDocuments(),
    Booking.countDocuments(),
    Expert.countDocuments({ verificationStatus: 'pending' }),
    Booking.countDocuments({ status: 'confirmed' }),
    Booking.countDocuments({ status: 'cancelled' }),
  ]);

  // Sum all consultation fees from confirmed bookings
  const revenueResult = await Booking.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: null, total: { $sum: '$consultationFeeAtBooking' } } },
  ]);
  const totalRevenue = revenueResult[0]?.total || 0;

  return {
    totalUsers,
    totalExperts,
    totalBookings,
    pendingExperts,
    confirmedBookings,
    cancelledBookings,
    totalRevenue,
  };
};

/**
 * Get all users (non-admin) with pagination and optional search/role filter.
 */
const getUsers = async (query) => {
  const { role, search, page = 1, limit = 20 } = query;
  const filter = { role: { $ne: 'admin' } };
  if (role) filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(filter).select('-password -refreshToken -passwordResetToken -passwordResetExpires').sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    User.countDocuments(filter),
  ]);

  return { users, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } };
};

/**
 * Toggle a user's isActive status.
 */
const toggleUserActive = async (userId, isActive) => {
  const user = await User.findByIdAndUpdate(userId, { isActive }, { new: true }).select('-password -refreshToken').lean();
  if (!user) throw new AppError('User not found', 404);
  if (user.role === 'admin') throw new AppError('Cannot modify admin accounts', 403);
  return user;
};

/**
 * Get all experts with their user info, pagination, and optional status filter.
 */
const getExperts = async (query) => {
  const { status, search, page = 1, limit = 20 } = query;
  const filter = {};
  if (status) filter.verificationStatus = status;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  let expertsQuery = Expert.find(filter)
    .populate('userId', 'name email isActive createdAt')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const [experts, total] = await Promise.all([
    expertsQuery,
    Expert.countDocuments(filter),
  ]);

  // Apply search filter on populated user name/email (post-query)
  const filtered = search
    ? experts.filter(
        (e) =>
          e.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
          e.userId?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : experts;

  return { experts: filtered, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } };
};

/**
 * Approve an expert — sets verificationStatus to 'approved' and isVerified to true.
 */
const approveExpert = async (expertId) => {
  const expert = await Expert.findByIdAndUpdate(
    expertId,
    { verificationStatus: 'approved', isVerified: true, rejectionReason: null },
    { new: true }
  ).populate('userId', 'name email');
  if (!expert) throw new AppError('Expert not found', 404);
  return expert;
};

/**
 * Reject an expert — sets verificationStatus to 'rejected' and isVerified to false.
 */
const rejectExpert = async (expertId, reason) => {
  const expert = await Expert.findByIdAndUpdate(
    expertId,
    { verificationStatus: 'rejected', isVerified: false, rejectionReason: reason || 'Profile does not meet our requirements.' },
    { new: true }
  ).populate('userId', 'name email');
  if (!expert) throw new AppError('Expert not found', 404);
  return expert;
};

/**
 * Get all bookings with pagination and optional status/date filter.
 */
const getBookings = async (query) => {
  const { status, page = 1, limit = 20 } = query;
  const filter = {};
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('clientId', 'name email')
      .populate({ path: 'expertId', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return { bookings, pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } };
};

module.exports = { getStats, getUsers, toggleUserActive, getExperts, approveExpert, rejectExpert, getBookings };
