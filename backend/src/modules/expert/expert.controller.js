// src/modules/expert/expert.controller.js

const expertService = require('./expert.service');
const catchAsync = require('../../utils/catchAsync');

const createProfile = catchAsync(async (req, res) => {
  const expert = await expertService.createProfile(req.user._id, req.body);
  res.status(201).json({ success: true, message: 'Expert profile created successfully', data: { expert } });
});

const getAllExperts = catchAsync(async (req, res) => {
  const result = await expertService.getAllExperts(req.query);
  res.status(200).json({ success: true, message: 'Experts retrieved successfully', data: result });
});

const getExpertById = catchAsync(async (req, res) => {
  const expert = await expertService.getExpertById(req.params.id);
  res.status(200).json({ success: true, message: 'Expert retrieved successfully', data: { expert } });
});

const getMyProfile = catchAsync(async (req, res) => {
  const expert = await expertService.getExpertByUserId(req.user._id);
  res.status(200).json({ success: true, message: 'Your expert profile retrieved successfully', data: { expert } });
});

const updateProfile = catchAsync(async (req, res) => {
  const expert = await expertService.updateProfile(req.params.id, req.user._id, req.body);
  res.status(200).json({ success: true, message: 'Expert profile updated successfully', data: { expert } });
});

const uploadSanad = catchAsync(async (req, res) => {
  if (!req.file) throw require('../../utils/AppError')('Please upload a file', 400);
  const filePath = `/uploads/sanad/${req.file.filename}`;
  const expert = await expertService.uploadSanad(req.user._id, filePath);
  res.status(200).json({
    success: true,
    message: 'Sanad uploaded. Your profile is now pending admin verification.',
    data: { expert },
  });
});

const getAvailableSlots = catchAsync(async (req, res) => {
  const slots = await expertService.getAvailableSlots(req.params.id, req.query.date);
  res.status(200).json({ success: true, data: { slots } });
});

module.exports = {
  createProfile,
  getAllExperts,
  getExpertById,
  getMyProfile,
  updateProfile,
  uploadSanad,
  getAvailableSlots,
};
