// src/modules/booking/booking.validator.js

const { body, validationResult } = require('express-validator');
const AppError = require('../../utils/AppError');

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(messages, 422));
  }
  next();
};

const validateCreateBooking = [
  body('expertId')
    .notEmpty()
    .withMessage('Expert ID is required')
    .isMongoId()
    .withMessage('Invalid Expert ID'),
  body('date')
    .notEmpty()
    .withMessage('Date is required')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Date must be in YYYY-MM-DD format'),
  body('slot').isObject().withMessage('Slot must be an object'),
  body('slot.start')
    .notEmpty()
    .withMessage('Slot start time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format'),
  body('slot.end')
    .notEmpty()
    .withMessage('Slot end time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format')
    .custom((end, { req }) => {
      if (end <= req.body.slot?.start) {
        throw new Error('Slot end time must be after start time');
      }
      return true;
    }),
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('caseDescription')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Case description cannot exceed 2000 characters'),
  handleValidation,
];

const validateCancelBooking = [
  body('reason')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Cancellation reason cannot exceed 500 characters'),
  body('referralMessage')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Referral message cannot exceed 1000 characters'),
  handleValidation,
];

module.exports = { validateCreateBooking, validateCancelBooking };