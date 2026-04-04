// src/modules/booking/booking.routes.js

const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const { validateCreateBooking, validateCancelBooking } = require('./booking.validator');
const { upload, handleMulterError } = require('../../middleware/upload');

// Multer stores bracket-notation form fields as literal strings, e.g.
//   "slot[start]" → req.body['slot[start]']   (NOT req.body.slot.start)
// This middleware normalises them into the nested object the validator expects.
const normalizeMultipartBody = (req, _res, next) => {
  if (req.body['slot[start]'] !== undefined || req.body['slot[end]'] !== undefined) {
    req.body.slot = {
      start: req.body['slot[start]'] || '',
      end:   req.body['slot[end]']   || '',
    };
    delete req.body['slot[start]'];
    delete req.body['slot[end]'];
  }
  next();
};

router.use(protect);

// Client routes
router.post(
  '/',
  restrictTo('client'),
  upload.array('documents', 3),   // 1. parse multipart → req.files + req.body text fields
  handleMulterError,               // 2. convert multer errors → AppError
  normalizeMultipartBody,          // 3. slot[start] → slot.start (bracket → nested)
  validateCreateBooking,           // 4. validate all fields
  bookingController.createBooking  // 5. create booking
);

router.get(
  '/my-bookings',
  restrictTo('client'),
  bookingController.getClientBookings
);

// Expert routes
router.get(
  '/expert-bookings',
  restrictTo('expert'),
  bookingController.getExpertBookings
);

router.patch(
  '/:id/confirm',
  restrictTo('expert'),
  bookingController.confirmBooking
);

// Shared routes (client + expert + admin)
router.get('/:id', bookingController.getBookingById);

router.patch(
  '/:id/cancel',
  restrictTo('client', 'expert', 'admin'),
  validateCancelBooking,
  bookingController.cancelBooking
);

module.exports = router;