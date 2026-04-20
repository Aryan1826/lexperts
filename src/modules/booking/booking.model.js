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
      enum: ['pending', 'payment_pending', 'confirmed', 'cancelled', 'payment_expired'],
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
    caseDescription: {
      type: String,
      trim: true,
      maxlength: [2000, 'Case description cannot exceed 2000 characters'],
    },
    // Expert's response to the client about their case
    expertNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Expert notes cannot exceed 2000 characters'],
    },
    // Expert's referral message when declining (e.g. "Contact Advocate XYZ for Criminal Law")
    referralMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Referral message cannot exceed 1000 characters'],
    },
    documents: [
      {
        originalName: { type: String, required: true },
        filename:     { type: String, required: true }, // stored name on disk
        path:         { type: String, required: true }, // relative URL path
        mimetype:     { type: String, required: true },
        size:         { type: Number, required: true }, // bytes
      },
    ],
    consultationFeeAtBooking: {
      type: Number,
      required: [true, 'Consultation fee at time of booking is required'],
      min: 0,
    },
    // Total fee paid = duration (in 30-min units) × consultationFeeAtBooking
    totalFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    // Number of 30-min units booked (e.g. 2 = 1 hour)
    durationUnits: {
      type: Number,
      min: 1,
      max: 8,
      default: 1,
    },
    // ── Fee breakdown (set when expert confirms) ──────────────────────────────
    platformFee: { type: Number, min: 0, default: 0 },
    gstAmount:   { type: Number, min: 0, default: 0 },
    totalAmount: { type: Number, min: 0, default: 0 },

    // Deadline by which client must pay (set when expert confirms, 30 min window)
    paymentDeadline: { type: Date, default: null },

    // ── Payment ──────────────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    razorpayOrderId: {
      type: String,
      default: null,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
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