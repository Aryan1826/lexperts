// src/modules/booking/booking.service.js

const mongoose = require('mongoose');
const Booking = require('./booking.model');
const Expert = require('../expert/expert.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

// ─── VALID_DAYS for expert availability ────────────────────────────────────
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Check if a time slot overlaps with any existing booking.
 * NOTE: This is now only used for informational purposes before attempting atomic create.
 * The actual atomicity is guaranteed by the transaction in createBooking.
 */
const isSlotAvailable = async (expertId, date, slot, excludeBookingId = null) => {
  const query = {
    expertId,
    date,
    status: { $in: ['pending', 'confirmed'] },
    $or: [
      {
        'slot.start': { $lt: slot.end },
        'slot.end': { $gt: slot.start },
      },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const conflict = await Booking.findOne(query);
  return !conflict;
};

/**
 * Validate that a requested slot falls within expert's available slots for that day.
 */
const validateSlotAgainstAvailability = (expert, date, slot) => {
  const bookingDate = new Date(date);
  const dayName = bookingDate.toLocaleDateString('en-US', { weekday: 'long' });

  // Validate day name is expected
  if (!VALID_DAYS.includes(dayName)) {
    throw new AppError(`Invalid day: ${dayName}`, 500);
  }

  const availability = expert.availability.find((a) => a.day === dayName);

  if (!availability || availability.slots.length === 0) {
    throw new AppError(`Expert is not available on ${dayName}`, 400);
  }

  // Check that requested slot falls completely within one of the available slots
  const slotValid = availability.slots.some(
    (s) => s.start <= slot.start && s.end >= slot.end
  );

  if (!slotValid) {
    throw new AppError(
      `Requested time slot (${slot.start}-${slot.end}) is outside expert's available hours on ${dayName}`,
      400
    );
  }
};

/**
 * Create a booking with full atomicity using MongoDB transactions.
 * This ensures:
 * 1. Slot availability check + creation are atomic (no race condition)
 * 2. If any step fails, the entire transaction is rolled back
 * 3. Duplicate slot attempts fail at the unique index level as final defense
 */
const createBooking = async (clientId, bookingData) => {
  const { expertId, date, slot, notes } = bookingData;

  // ─── PRE-TRANSACTION VALIDATION ───────────────────────────────────────
  // These checks don't require atomicity and can fail fast

  // 1. Validate booking date is not in past
  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    throw new AppError('Booking date cannot be in the past', 400);
  }

  // 2. Fetch expert and validate exists
  const expert = await Expert.findById(expertId).lean();
  if (!expert) {
    throw new AppError('Expert not found', 404);
  }

  // 3. Validate slot matches expert's availability
  // (Need full expert doc for availability, so fetch again if lean above)
  const expertFull = await Expert.findById(expertId);
  validateSlotAgainstAvailability(expertFull, date, slot);

  // ─── ATOMIC TRANSACTION ───────────────────────────────────────────────
  // Start a session for the transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check for conflicts WITHIN the transaction
    // This read is now isolated — other concurrent writes won't interfere
    const conflictingBooking = await Booking.findOne(
      {
        expertId,
        date,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          {
            'slot.start': { $lt: slot.end },
            'slot.end': { $gt: slot.start },
          },
        ],
      },
      {},
      { session }
    );

    if (conflictingBooking) {
      throw new AppError('This time slot is already booked. Please choose another slot.', 409);
    }

    // Create the booking atomically
    // If someone else claimed this slot between our check and now, the unique index will catch it
    const booking = await Booking.create(
      [
        {
          clientId,
          expertId,
          date,
          slot,
          notes: notes || '',
          consultationFeeAtBooking: expert.consultationFee,
        },
      ],
      { session }
    );

    // Commit transaction if all operations succeed
    await session.commitTransaction();

    // Populate references after commit (outside transaction for efficiency)
    const populatedBooking = await Booking.findById(booking[0]._id)
      .populate('clientId', 'name email')
      .populate({
        path: 'expertId',
        select: 'specialization consultationFee userId',
        populate: { path: 'userId', select: 'name email' },
      });

    return populatedBooking;
  } catch (error) {
    // Rollback transaction on any error
    await session.abortTransaction();

    // If it's a duplicate key error on the unique index, return a user-friendly message
    if (error.code === 11000) {
      logger.warn('Duplicate booking attempt detected (race condition caught by unique index)', {
        expertId,
        date,
        slot,
      });
      throw new AppError('This time slot was just booked by another user. Please try another slot.', 409);
    }

    throw error;
  } finally {
    // Always end the session
    session.endSession();
  }
};

/**
 * Get all bookings for a client with pagination and optional status filter.
 */
const getClientBookings = async (clientId, query) => {
  const { status, page = 1, limit = 10 } = query;
  const filter = { clientId };
  if (status) filter.status = status;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('expertId', 'specialization consultationFee userId')
      .populate({ path: 'expertId', populate: { path: 'userId', select: 'name email' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get all bookings for an expert with pagination, optional status filter, and date filter.
 */
const getExpertBookings = async (userId, query) => {
  const { status, date, page = 1, limit = 10 } = query;

  const expert = await Expert.findOne({ userId });
  if (!expert) throw new AppError('Expert profile not found', 404);

  const filter = { expertId: expert._id };
  if (status) filter.status = status;
  if (date) filter.date = date;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .populate('clientId', 'name email')
      .sort({ date: 1, 'slot.start': 1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Booking.countDocuments(filter),
  ]);

  return {
    bookings,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

/**
 * Get a single booking by ID with role-based access control.
 */
const getBookingById = async (bookingId, userId, userRole) => {
  const booking = await Booking.findById(bookingId)
    .populate('clientId', 'name email')
    .populate({ path: 'expertId', populate: { path: 'userId', select: 'name email' } });

  if (!booking) throw new AppError('Booking not found', 404);

  const expert = await Expert.findById(booking.expertId._id);

  const isClient = booking.clientId._id.toString() === userId.toString();
  const isExpert = expert?.userId.toString() === userId.toString();
  const isAdmin = userRole === 'admin';

  if (!isClient && !isExpert && !isAdmin) {
    throw new AppError('You do not have access to this booking', 403);
  }

  return booking;
};

/**
 * Confirm a pending booking using atomic operation.
 * Ensures status transitions are safe under concurrency.
 */
const confirmBooking = async (bookingId, userId) => {
  const expert = await Expert.findOne({ userId });
  if (!expert) throw new AppError('Expert profile not found', 404);

  // Use findOneAndUpdate for atomic status transition
  const booking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      expertId: expert._id,
      status: 'pending', // Only update if currently pending
    },
    {
      $set: { status: 'confirmed' },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('clientId', 'name email')
    .populate('expertId');

  if (!booking) {
    // Either booking doesn't exist, doesn't belong to this expert, or is not pending
    const existingBooking = await Booking.findById(bookingId);
    if (!existingBooking) throw new AppError('Booking not found', 404);
    if (existingBooking.expertId.toString() !== expert._id.toString()) {
      throw new AppError('This booking does not belong to your expert account', 403);
    }
    throw new AppError(`Cannot confirm a booking with status: ${existingBooking.status}`, 400);
  }

  return booking;
};

/**
 * Cancel a booking using atomic operation.
 * Ensures only authorized users can cancel and status transitions are safe.
 */
const cancelBooking = async (bookingId, userId, userRole, reason) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);

  const expert = await Expert.findById(booking.expertId);

  const isClient = booking.clientId.toString() === userId.toString();
  const isExpert = expert?.userId.toString() === userId.toString();
  const isAdmin = userRole === 'admin';

  if (!isClient && !isExpert && !isAdmin) {
    throw new AppError('You are not authorized to cancel this booking', 403);
  }

  if (booking.status === 'cancelled') {
    throw new AppError('Booking is already cancelled', 400);
  }

  // Use atomic update with $set to ensure status transitions correctly
  const updatedBooking = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      status: { $ne: 'cancelled' }, // Only update if not already cancelled
    },
    {
      $set: {
        status: 'cancelled',
        cancelledBy: userId,
        cancellationReason: reason || null,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  )
    .populate('clientId', 'name email')
    .populate('expertId');

  return updatedBooking;
};

module.exports = {
  createBooking,
  getClientBookings,
  getExpertBookings,
  getBookingById,
  confirmBooking,
  cancelBooking,
};
