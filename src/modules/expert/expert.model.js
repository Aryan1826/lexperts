// src/modules/expert/expert.model.js

const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    start: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'],
    },
    end: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'],
    },
  },
  {
    _id: false,
    validate: {
      validator: function (slot) {
        return slot.end > slot.start;
      },
      message: 'End time must be after start time',
    },
  }
);

const availabilitySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: [true, 'Day is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    slots: {
      type: [timeSlotSchema],
      validate: {
        validator: (slots) => slots.length > 0,
        message: 'At least one time slot is required per day',
      },
    },
  },
  { _id: false }
);

const expertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
    },
    specialization: {
      type: [String],
      required: [true, 'At least one specialization is required'],
      validate: {
        validator: (arr) => arr.length > 0,
        message: 'Specialization cannot be empty',
      },
    },
    experience: {
      type: Number,
      required: [true, 'Experience is required'],
      min: [0, 'Experience cannot be negative'],
      max: [70, 'Experience value is unrealistic'],
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: [0, 'Fee cannot be negative'],
    },
    bio: {
      type: String,
      required: [true, 'Bio is required'],
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    availability: {
      type: [availabilitySchema],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    isProfileComplete: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

expertSchema.index({ specialization: 1 });
expertSchema.index({ verificationStatus: 1 });
expertSchema.index({ rating: -1 });
expertSchema.index({ consultationFee: 1 });

module.exports = mongoose.model('Expert', expertSchema);