// src/modules/payment/payment.service.js

const Razorpay = require('razorpay');
const crypto = require('crypto');

const Booking = require('../booking/booking.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { sendPaymentConfirmedClientEmail, sendPaymentConfirmedExpertEmail } = require('../../utils/emailService');
const { createMeetLink } = require('../../utils/googleMeet');

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_REPLACE_ME') {
    throw new AppError('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env', 503);
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

/**
 * Step 1 — Create a Razorpay order for an existing booking that is payment_pending.
 * Validates: booking exists, belongs to client, is in payment_pending status,
 * and the payment deadline hasn't passed.
 */
const createOrder = async (bookingId, clientId) => {
  const booking = await Booking.findById(bookingId)
    .populate({ path: 'expertId', populate: { path: 'userId', select: 'name' } });

  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.clientId.toString() !== clientId.toString()) {
    throw new AppError('This booking does not belong to you', 403);
  }
  if (booking.status !== 'payment_pending') {
    throw new AppError(`Payment is not required for a booking with status: ${booking.status}`, 400);
  }
  if (booking.paymentDeadline && new Date() > booking.paymentDeadline) {
    throw new AppError('Payment window has expired. The slot has been released.', 410);
  }

  const amountInPaise = booking.totalAmount * 100;

  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `lexp_${bookingId.toString().slice(-8)}_${Date.now()}`,
    notes: {
      bookingId: bookingId.toString(),
      clientId: clientId.toString(),
    },
  });

  logger.info('Razorpay order created', { orderId: order.id, bookingId, amount: booking.totalAmount });

  return {
    orderId: order.id,
    amount: booking.totalAmount,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
    expertName: booking.expertId?.userId?.name || 'Expert',
    breakdown: {
      expertFee:   booking.totalFee || (booking.durationUnits * booking.consultationFeeAtBooking),
      platformFee: booking.platformFee,
      gstAmount:   booking.gstAmount,
      totalAmount: booking.totalAmount,
    },
  };
};

/**
 * Step 2 — Verify Razorpay HMAC signature, then confirm the booking.
 * On success: booking → confirmed, paymentStatus → paid.
 * Both client and expert receive confirmation emails.
 */
const verifyAndConfirm = async ({ razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, clientId }) => {
  // ── Verify HMAC signature ───────────────────────────────────────────────────
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    logger.warn('Invalid Razorpay signature', { razorpay_order_id, bookingId });
    throw new AppError('Payment verification failed. Invalid signature.', 400);
  }

  // ── Update booking atomically ───────────────────────────────────────────────
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      clientId,
      status: 'payment_pending',
    },
    {
      $set: {
        status: 'confirmed',
        paymentStatus: 'paid',
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
      },
    },
    { new: true }
  )
    .populate('clientId', 'name email')
    .populate({
      path: 'expertId',
      select: 'consultationFee userId',
      populate: { path: 'userId', select: 'name email' },
    });

  if (!booking) {
    throw new AppError('Could not confirm booking. It may have expired or already been paid.', 409);
  }

  logger.info('Booking confirmed after payment', { bookingId, razorpay_payment_id });

  // ── Generate Meet link then email both parties ───────────────────────────────
  const clientName = booking.clientId?.name || 'Client';
  const expertName = booking.expertId?.userId?.name || 'Expert';

  // Run in background: generate link → save → email (so API responds instantly)
  ;(async () => {
    try {
      const meetLink = await createMeetLink(booking, clientName, expertName);
      if (meetLink) {
        await Booking.findByIdAndUpdate(bookingId, { meetLink });
        booking.meetLink = meetLink;
      }
    } catch { /* link generation failed — Jitsi fallback handled inside createMeetLink */ }

    // Send confirmation emails (with meet link if available)
    sendPaymentConfirmedClientEmail(
      booking,
      booking.clientId?.email,
      clientName,
      expertName
    ).catch(() => {});

    sendPaymentConfirmedExpertEmail(
      booking,
      booking.expertId?.userId?.email,
      expertName,
      clientName
    ).catch(() => {});
  })();

  return booking;
};

module.exports = { createOrder, verifyAndConfirm };
