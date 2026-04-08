// src/modules/payment/payment.controller.js

const catchAsync = require('../../utils/catchAsync');
const paymentService = require('./payment.service');

/**
 * POST /api/v1/payments/create-order
 * Body: { expertId, date, slot: { start, end }, duration }
 * Returns: { orderId, amount, currency, keyId }
 */
const createOrder = catchAsync(async (req, res) => {
  const { expertId, date, slot, duration } = req.body;

  if (!expertId || !date || !slot?.start || !slot?.end) {
    const AppError = require('../../utils/AppError');
    throw new AppError('expertId, date, slot.start and slot.end are required', 400);
  }

  const result = await paymentService.createOrder({
    expertId,
    date,
    slot,
    duration: duration || 1,
    clientId: req.user._id,
  });

  res.status(200).json({ success: true, data: result });
});

/**
 * POST /api/v1/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature,
 *         expertId, date, slot, duration, caseDescription }
 * Verifies HMAC signature then creates the booking atomically.
 */
const verifyPayment = catchAsync(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    expertId,
    date,
    slot,
    duration,
    caseDescription,
  } = req.body;

  const booking = await paymentService.verifyAndBook({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    expertId,
    date,
    slot,
    duration,
    caseDescription,
    clientId: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: 'Payment verified. Booking request sent to the expert!',
    data: { booking },
  });
});

module.exports = { createOrder, verifyPayment };
