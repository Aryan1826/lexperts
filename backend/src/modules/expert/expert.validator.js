// src/modules/expert/expert.validator.js

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

const validateCreateExpert = [
  body('specialization')
    .isArray({ min: 1 })
    .withMessage('Specialization must be a non-empty array'),
  body('specialization.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each specialization must be a non-empty string'),
  body('experience')
    .isFloat({ min: 0, max: 70 })
    .withMessage('Experience must be a number between 0 and 70'),
  body('consultationFee')
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a non-negative number'),
  body('bio')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Bio must be between 20 and 1000 characters'),
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array'),
  body('availability.*.day')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day provided'),
  body('availability.*.slots')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Each day must have at least one slot'),
  body('availability.*.slots.*.start')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Slot start time must be in HH:MM format'),
  body('availability.*.slots.*.end')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Slot end time must be in HH:MM format'),
  handleValidation,
];

const validateUpdateExpert = [
  body('specialization')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Specialization must be a non-empty array'),
  body('specialization.*')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Each specialization must be a non-empty string'),
  body('experience')
    .optional()
    .isFloat({ min: 0, max: 70 })
    .withMessage('Experience must be a number between 0 and 70'),
  body('consultationFee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Consultation fee must be a non-negative number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Bio must be between 20 and 1000 characters'),
  body('availability')
    .optional()
    .isArray()
    .withMessage('Availability must be an array'),
  body('availability.*.day')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Invalid day provided'),
  body('availability.*.slots')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Each day must have at least one slot'),
  body('availability.*.slots.*.start')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Slot start time must be in HH:MM format'),
  body('availability.*.slots.*.end')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Slot end time must be in HH:MM format'),
  handleValidation,
];

module.exports = { validateCreateExpert, validateUpdateExpert };