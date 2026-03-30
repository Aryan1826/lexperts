// src/modules/booking/booking.routes.js

const express = require('express');
const router = express.Router();
const bookingController = require('./booking.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const { validateCreateBooking, validateCancelBooking } = require('./booking.validator');

router.use(protect);

// Client routes
router.post(
  '/',
  restrictTo('client'),
  validateCreateBooking,
  bookingController.createBooking
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