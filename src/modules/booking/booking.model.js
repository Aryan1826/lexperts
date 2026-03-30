// src/modules/booking/booking.model.js

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client is required'],
    },
    expertId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expert',
      required: [true, 'Expert is required'],
    },
    date: {
      type: String,
      required: [true, 'Booking date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    slot: {
      start: {
        type: String,
        required: [true, 'Slot start time is required'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'],
      },
      end: {
        type: String,
        required: [true, 'Slot end time is required'],
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'pending',
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Cancellation reason cannot exceed 500 characters'],
    },
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    consultationFeeAtBooking: {
      type: Number,
      required: [true, 'Consultation fee at time of booking is required'],
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({ expertId: 1, date: 1 });
bookingSchema.index({ clientId: 1, status: 1 });
bookingSchema.index({ expertId: 1, status: 1 });
bookingSchema.index(
  { expertId: 1, date: 1, 'slot.start': 1, 'slot.end': 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);

module.exports = mongoose.model('Booking', bookingSchema);