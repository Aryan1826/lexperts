// src/modules/expert/expert.service.js

const Expert = require('./expert.model');
const User = require('../user/user.model');
const AppError = require('../../utils/AppError');

const createProfile = async (userId, profileData) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  if (user.role !== 'expert') throw new AppError('Only users with expert role can create an expert profile', 403);

  const existing = await Expert.findOne({ userId });
  if (existing) throw new AppError('Expert profile already exists for this user', 409);

  const expert = await Expert.create({ userId, ...profileData });
  return expert.populate('userId', 'name email');
};

const getAllExperts = async (query) => {
  const { specialization, minFee, maxFee, minRating, sort, page = 1, limit = 10 } = query;

  const filter = {};

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
    rating: { rating: -1 },
    fee_asc: { consultationFee: 1 },
    fee_desc: { consultationFee: -1 },
    experience: { experience: -1 },
  };
  const sortBy = sortOptions[sort] || { createdAt: -1 };

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

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
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
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

  const restrictedFields = ['userId', 'rating', 'totalReviews', 'isVerified'];
  restrictedFields.forEach((field) => delete updateData[field]);

  const updated = await Expert.findByIdAndUpdate(
    expertId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('userId', 'name email');

  return updated;
};

module.exports = {
  createProfile,
  getAllExperts,
  getExpertById,
  getExpertByUserId,
  updateProfile,
};