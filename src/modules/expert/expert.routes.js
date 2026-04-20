// src/modules/expert/expert.routes.js

const express = require('express');
const router = express.Router();
const expertController = require('./expert.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const { validateCreateExpert, validateUpdateExpert } = require('./expert.validator');
const { sanadUpload, handleMulterError } = require('../../middleware/upload');

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', expertController.getAllExperts);
router.get('/:id/available-slots', expertController.getAvailableSlots);
router.get('/:id', expertController.getExpertById);

// ─── Protected routes ─────────────────────────────────────────────────────────
router.use(protect);

router.get('/me/profile', restrictTo('expert'), expertController.getMyProfile);
router.post('/', restrictTo('expert'), validateCreateExpert, expertController.createProfile);
router.put('/:id', restrictTo('expert'), validateUpdateExpert, expertController.updateProfile);

// Sanad document upload — single file, expert only
router.post(
  '/me/sanad',
  restrictTo('expert'),
  sanadUpload.single('sanad'),
  handleMulterError,
  expertController.uploadSanad
);

module.exports = router;
