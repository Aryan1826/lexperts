// client/src/services/payment.service.js

import api from './api'

/**
 * Step 1 — Ask backend to create a Razorpay order.
 * Returns { orderId, amount, currency, keyId }
 */
export const createRazorpayOrder = async ({ expertId, date, slot, duration }) => {
  const res = await api.post('/payments/create-order', { expertId, date, slot, duration })
  return res.data.data
}

/**
 * Step 2 — Send Razorpay payment response to backend for HMAC verification.
 * Backend verifies signature and atomically creates the booking.
 * Returns { booking }
 */
export const verifyRazorpayPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  expertId,
  date,
  slot,
  duration,
  caseDescription,
}) => {
  const res = await api.post('/payments/verify', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    expertId,
    date,
    slot,
    duration,
    caseDescription,
  })
  return res.data
}

/**
 * Dynamically loads the Razorpay checkout.js script.
 * Resolves immediately if already loaded.
 */
export const loadRazorpayScript = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = resolve
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'))
    document.body.appendChild(script)
  })
