// src/modules/payment/payment.controller.js

const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const paymentService = require('./payment.service');

/**
 * POST /api/v1/payments/create-order
 * Body: { bookingId }
 * Returns: { orderId, amount, currency, keyId, breakdown }
 */
const createOrder = catchAsync(async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) throw new AppError('bookingId is required', 400);

  const result = await paymentService.createOrder(bookingId, req.user._id);
  res.status(200).json({ success: true, data: result });
});

/**
 * POST /api/v1/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId }
 * Verifies HMAC then confirms the booking.
 */
const verifyPayment = catchAsync(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
    throw new AppError('razorpay_order_id, razorpay_payment_id, razorpay_signature and bookingId are required', 400);
  }

  const booking = await paymentService.verifyAndConfirm({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
    clientId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: 'Payment confirmed! Your booking is now confirmed.',
    data: { booking },
  });
});

module.exports = { createOrder, verifyPayment };
