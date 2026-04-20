// client/src/services/payment.service.js

import api from './api'

/**
 * Step 1 — Create a Razorpay order for an existing payment_pending booking.
 * Returns { orderId, amount, currency, keyId, expertName, breakdown }
 */
export const createRazorpayOrder = async ({ bookingId }) => {
  const res = await api.post('/payments/create-order', { bookingId })
  return res.data.data
}

/**
 * Step 2 — Send Razorpay response to backend for HMAC verification + booking confirmation.
 */
export const verifyRazorpayPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  bookingId,
}) => {
  const res = await api.post('/payments/verify', {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
  })
  return res.data
}

/**
 * Dynamically loads Razorpay checkout.js. Resolves immediately if already loaded.
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
