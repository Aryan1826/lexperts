// src/modules/booking/booking.controller.js

const bookingService = require('./booking.service');
const catchAsync = require('../../utils/catchAsync');

const createBooking = catchAsync(async (req, res) => {
  // Map multer file objects → lean document metadata stored in DB
  const documents = (req.files || []).map((f) => ({
    originalName: f.originalname,
    filename:     f.filename,
    path:         `/uploads/bookings/${f.filename}`,
    mimetype:     f.mimetype,
    size:         f.size,
  }));

  const booking = await bookingService.createBooking(req.user._id, {
    ...req.body,
    documents,
  });

  res.status(201).json({
    success: true,
    message: 'Booking created successfully',
    data: { booking },
  });
});

const getClientBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getClientBookings(req.user._id, req.query);

  res.status(200).json({
    success: true,
    message: 'Client bookings retrieved successfully',
    data: result,
  });
});

const getExpertBookings = catchAsync(async (req, res) => {
  const result = await bookingService.getExpertBookings(req.user._id, req.query);

  res.status(200).json({
    success: true,
    message: 'Expert bookings retrieved successfully',
    data: result,
  });
});

const getBookingById = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.params.id,
    req.user._id,
    req.user.role
  );

  res.status(200).json({
    success: true,
    message: 'Booking retrieved successfully',
    data: { booking },
  });
});

const confirmBooking = catchAsync(async (req, res) => {
  // Expert can optionally include their response notes when confirming
  const booking = await bookingService.confirmBooking(
    req.params.id,
    req.user._id,
    req.body.expertNotes
  );

  res.status(200).json({
    success: true,
    message: 'Booking confirmed successfully',
    data: { booking },
  });
});

const addExpertNote = catchAsync(async (req, res) => {
  const booking = await bookingService.addExpertNote(
    req.params.id,
    req.user._id,
    req.body.expertNotes
  );

  res.status(200).json({
    success: true,
    message: 'Expert note saved successfully',
    data: { booking },
  });
});

const cancelBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.cancelBooking(
    req.params.id,
    req.user._id,
    req.user.role,
    req.body.reason,
    req.body.referralMessage  // Expert can pass referral info when declining
  );

  res.status(200).json({
    success: true,
    message: 'Booking cancelled successfully',
    data: { booking },
  });
});

module.exports = {
  createBooking,
  getClientBookings,
  getExpertBookings,
  getBookingById,
  confirmBooking,
  addExpertNote,
  cancelBooking,
};