// src/modules/booking/booking.service.js

const Booking = require('./booking.model');
const Expert = require('../expert/expert.model');
const AppError = require('../../utils/AppError');

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

const validateSlotAgainstAvailability = (expert, date, slot) => {
  const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
  const availability = expert.availability.find((a) => a.day === dayName);

  if (!availability || availability.slots.length === 0) {
    throw new AppError(`Expert is not available on ${dayName}`, 400);
  }

  const slotValid = availability.slots.some(
    (s) => s.start <= slot.start && s.end >= slot.end
  );

  if (!slotValid) {
    throw new AppError(
      `Requested time slot is outside expert availability on ${dayName}`,
      400
    );
  }
};

const createBooking = async (clientId, bookingData) => {
  const { expertId, date, slot, notes } = bookingData;

  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) throw new AppError('Booking date cannot be in the past', 400);

  const expert = await Expert.findById(expertId);
  if (!expert) throw new AppError('Expert not found', 404);

  validateSlotAgainstAvailability(expert, date, slot);

  const available = await isSlotAvailable(expertId, date, slot);
  if (!available) {
    throw new AppError('This time slot is already booked. Please choose another slot.', 409);
  }

  const booking = await Booking.create({
    clientId,
    expertId,
    date,
    slot,
    notes,
    consultationFeeAtBooking: expert.consultationFee,
  });

  return booking
    .populate('clientId', 'name email')
    .then((b) => b.populate('expertId', 'specialization consultationFee userId'));
};

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

const confirmBooking = async (bookingId, userId) => {
  const expert = await Expert.findOne({ userId });
  if (!expert) throw new AppError('Expert profile not found', 404);

  const booking = await Booking.findOne({ _id: bookingId, expertId: expert._id });
  if (!booking) throw new AppError('Booking not found', 404);

  if (booking.status !== 'pending') {
    throw new AppError(`Cannot confirm a booking with status: ${booking.status}`, 400);
  }

  booking.status = 'confirmed';
  await booking.save();

  return booking
    .populate('clientId', 'name email')
    .then((b) => b.populate('expertId'));
};

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

  booking.status = 'cancelled';
  booking.cancelledBy = userId;
  if (reason) booking.cancellationReason = reason;
  await booking.save();

  return booking
    .populate('clientId', 'name email')
    .then((b) => b.populate('expertId'));
};

module.exports = {
  createBooking,
  getClientBookings,
  getExpertBookings,
  getBookingById,
  confirmBooking,
  cancelBooking,
};