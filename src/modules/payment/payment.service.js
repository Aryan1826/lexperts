// src/modules/payment/payment.service.js

const Razorpay = require('razorpay');
const crypto = require('crypto');
const mongoose = require('mongoose');

const Booking = require('../booking/booking.model');
const Expert = require('../expert/expert.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');
const { sendBookingCreatedEmail } = require('../../utils/emailService');

// ─── Lazy Razorpay instance (throws at call time if keys missing) ─────────────
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
 * Step 1 — Create a Razorpay order for the given booking parameters.
 * Does a soft slot conflict check (final atomicity is in verifyAndBook).
 * Returns { orderId, amount, currency, keyId } to the frontend.
 */
const createOrder = async ({ expertId, date, slot, duration, clientId }) => {
  // ── Validate expert ─────────────────────────────────────────────────────────
  const expert = await Expert.findById(expertId).lean();
  if (!expert) throw new AppError('Expert not found', 404);
  if (!expert.isVerified || expert.verificationStatus !== 'approved') {
    throw new AppError('This expert is not currently accepting bookings', 403);
  }

  // ── Soft conflict check (prevent obvious double-booking before Razorpay) ────
  const conflict = await Booking.findOne({
    expertId,
    date,
    'slot.start': { $lt: slot.end },
    'slot.end': { $gt: slot.start },
    status: { $in: ['pending', 'confirmed'] },
  });
  if (conflict) {
    throw new AppError('This slot is already booked. Please choose a different time.', 409);
  }

  // ── Calculate fee ───────────────────────────────────────────────────────────
  const durationUnits = Math.max(1, parseInt(duration) || 1);
  const totalAmount = durationUnits * expert.consultationFee; // in ₹
  const amountInPaise = totalAmount * 100; // Razorpay uses paise

  // ── Create Razorpay order ───────────────────────────────────────────────────
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `lexp_${clientId.toString().slice(-6)}_${Date.now()}`,
    notes: {
      expertId: expertId.toString(),
      clientId: clientId.toString(),
      date,
      slotStart: slot.start,
      slotEnd: slot.end,
      durationUnits: durationUnits.toString(),
    },
  });

  logger.info('Razorpay order created', { orderId: order.id, amount: totalAmount, expertId, clientId });

  return {
    orderId: order.id,
    amount: totalAmount,      // ₹ (for display)
    amountInPaise,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Step 2 — Verify Razorpay signature, then atomically create the booking.
 * The HMAC signature check proves the payment came from Razorpay (not forged).
 * Booking creation uses a MongoDB transaction so a concurrent booking attempt
 * on the same slot will be rejected.
 */
const verifyAndBook = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  expertId,
  date,
  slot,
  duration,
  caseDescription,
  documents,
  clientId,
}) => {
  // ── 1. Verify Razorpay HMAC signature ───────────────────────────────────────
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    logger.warn('Invalid Razorpay signature', { razorpay_order_id, razorpay_payment_id });
    throw new AppError('Payment verification failed. Signature mismatch.', 400);
  }

  // ── 2. Fetch expert ──────────────────────────────────────────────────────────
  const expert = await Expert.findById(expertId).lean();
  if (!expert) throw new AppError('Expert not found', 404);

  const durationUnits = Math.max(1, parseInt(duration) || 1);
  const totalFee = durationUnits * expert.consultationFee;

  // ── 3. Atomic booking creation via MongoDB transaction ───────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Conflict check inside transaction (prevents race conditions)
    const conflict = await Booking.findOne(
      {
        expertId,
        date,
        status: { $in: ['pending', 'confirmed'] },
        $or: [{ 'slot.start': { $lt: slot.end }, 'slot.end': { $gt: slot.start } }],
      },
      {},
      { session }
    );

    if (conflict) {
      throw new AppError('This slot was just booked by someone else. Please choose another.', 409);
    }

    const [booking] = await Booking.create(
      [
        {
          clientId,
          expertId,
          date,
          slot,
          durationUnits,
          totalFee,
          consultationFeeAtBooking: expert.consultationFee,
          caseDescription: caseDescription || '',
          documents: documents || [],
          status: 'pending',
          paymentStatus: 'paid',
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Populate for email + response
    const populated = await Booking.findById(booking._id)
      .populate('clientId', 'name email')
      .populate({
        path: 'expertId',
        select: 'specialization consultationFee userId',
        populate: { path: 'userId', select: 'name email' },
      });

    // Fire-and-forget email to expert
    sendBookingCreatedEmail(
      populated,
      populated.expertId?.userId?.email,
      populated.clientId?.name,
      populated.expertId?.userId?.name
    ).catch(() => {});

    logger.info('Booking created after payment', {
      bookingId: booking._id,
      razorpay_payment_id,
      totalFee,
    });

    return populated;
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 11000) {
      throw new AppError('This time slot was just booked. Please select another.', 409);
    }
    throw err;
  } finally {
    session.endSession();
  }
};

module.exports = { createOrder, verifyAndBook };
