// src/modules/expert/expert.routes.js

const express = require('express');
const router = express.Router();
const expertController = require('./expert.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const { validateCreateExpert, validateUpdateExpert } = require('./expert.validator');

// Public
router.get('/', expertController.getAllExperts);
router.get('/:id', expertController.getExpertById);

// Protected
router.use(protect);

router.get('/me/profile', restrictTo('expert'), expertController.getMyProfile);
router.post('/', restrictTo('expert'), validateCreateExpert, expertController.createProfile);
router.put('/:id', restrictTo('expert'), validateUpdateExpert, expertController.updateProfile);

module.exports = router;