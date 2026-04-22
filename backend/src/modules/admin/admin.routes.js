// src/modules/admin/admin.routes.js

const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { protect, restrictTo } = require('../../middleware/authMiddleware');

// All admin routes require authentication + admin role
router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', adminController.getStats);

// Users
router.get('/users', adminController.getUsers);
router.patch('/users/:id/deactivate', adminController.deactivateUser);
router.patch('/users/:id/activate', adminController.activateUser);

// Experts
router.get('/experts', adminController.getExperts);
router.patch('/experts/:id/approve', adminController.approveExpert);
router.patch('/experts/:id/reject', adminController.rejectExpert);

// Bookings
router.get('/bookings', adminController.getBookings);

module.exports = router;
