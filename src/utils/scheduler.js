// src/utils/scheduler.js
// Runs background cron jobs after the server starts.

const cron = require('node-cron');
const Booking = require('../modules/booking/booking.model');
const logger = require('./logger');
const { sendBookingCancelledEmail } = require('./emailService');

/**
 * Every 5 minutes: find payment_pending bookings whose deadline has passed
 * and mark them as payment_expired. Notify both client and expert.
 */
const startPaymentExpiryJob = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const expired = await Booking.find({
        status: 'payment_pending',
        paymentDeadline: { $lt: new Date() },
      })
        .populate('clientId', 'name email')
        .populate({
          path: 'expertId',
          select: 'consultationFeeAtBooking userId',
          populate: { path: 'userId', select: 'name email' },
        });

      if (expired.length === 0) return;

      // Bulk-update all expired bookings
      const ids = expired.map((b) => b._id);
      await Booking.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'payment_expired', paymentStatus: 'unpaid' } }
      );

      logger.info(`Payment expiry job: expired ${expired.length} booking(s)`, { ids });

      // Notify both parties — fire and forget
      for (const booking of expired) {
        const clientEmail  = booking.clientId?.email;
        const clientName   = booking.clientId?.name  || 'Client';
        const expertName   = booking.expertId?.userId?.name  || 'Expert';
        const expertEmail  = booking.expertId?.userId?.email;

        // Notify client
        if (clientEmail) {
          sendBookingCancelledEmail(
            booking, clientEmail, clientName, expertName, 'expert',
            'Payment window expired. Your slot has been released. You may rebook anytime.'
          ).catch(() => {});
        }
        // Notify expert
        if (expertEmail) {
          sendBookingCancelledEmail(
            booking, expertEmail, expertName, clientName, 'client',
            'The client did not complete payment within 30 minutes. The slot has been released.'
          ).catch(() => {});
        }
      }
    } catch (err) {
      logger.error('Payment expiry cron job failed', { error: err.message });
    }
  });

  logger.info('Payment expiry scheduler started (runs every 5 minutes)');
};

module.exports = { startPaymentExpiryJob };
