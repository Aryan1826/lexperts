// src/modules/payment/payment.routes.js

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../../middleware/authMiddleware');
const paymentController = require('./payment.controller');

// All payment routes require a logged-in client
router.use(protect);
router.use(restrictTo('client'));

// POST /api/v1/payments/create-order  — Step 1: get Razorpay order ID
router.post('/create-order', paymentController.createOrder);

// POST /api/v1/payments/verify        — Step 2: verify payment + create booking
router.post('/verify', paymentController.verifyPayment);

module.exports = router;
