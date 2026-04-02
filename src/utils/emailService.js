// src/utils/emailService.js

const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Transporter ──────────────────────────────────────────────────────────────
// Uses EMAIL_* env vars. In development these point to Ethereal (fake inbox).
// In production swap for Gmail App Password or SendGrid SMTP.
let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT, 10) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
};

// ─── Base template wrapper ────────────────────────────────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>LExperts</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f2ec; color: #0f0e0c; }
    .wrapper { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: #0f0e0c; padding: 28px 36px; }
    .logo { font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .logo span { color: #b8922a; }
    .body { padding: 36px; }
    .title { font-size: 22px; font-weight: 700; color: #0f0e0c; margin-bottom: 12px; }
    .subtitle { font-size: 15px; color: #8a8780; margin-bottom: 28px; line-height: 1.6; }
    .detail-box { background: #f5f2ec; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ede9e0; font-size: 14px; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { color: #8a8780; font-weight: 500; }
    .detail-value { color: #0f0e0c; font-weight: 600; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.3px; }
    .badge-pending  { background: #fff3e0; color: #e65100; }
    .badge-confirmed { background: #e8f5e9; color: #2e7d32; }
    .badge-cancelled { background: #fce4ec; color: #c62828; }
    .btn { display: inline-block; margin-top: 8px; padding: 13px 28px; background: #b8922a; color: #ffffff; border-radius: 6px; font-size: 14px; font-weight: 700; text-decoration: none; }
    .footer { background: #f5f2ec; padding: 20px 36px; font-size: 12px; color: #8a8780; text-align: center; border-top: 1px solid #ede9e0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo"><span>L</span>Experts</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      This is an automated message from LExperts. Please do not reply to this email.
    </div>
  </div>
</body>
</html>
`;

// ─── Email Templates ──────────────────────────────────────────────────────────

const templates = {
  // Sent to expert when a new booking is created
  bookingCreated: ({ expertName, clientName, date, slotStart, slotEnd, fee }) =>
    baseTemplate(`
      <p class="title">New Booking Request 📋</p>
      <p class="subtitle">Hi <strong>${expertName}</strong>, you have a new consultation request waiting for your confirmation.</p>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">Client</span>
          <span class="detail-value">${clientName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${slotStart} – ${slotEnd}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Consultation Fee</span>
          <span class="detail-value">₹${fee}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value"><span class="badge badge-pending">Awaiting Confirmation</span></span>
        </div>
      </div>
      <p style="font-size:14px;color:#8a8780;">Log in to your Expert Dashboard to confirm or decline this booking.</p>
    `),

  // Sent to client when expert confirms
  bookingConfirmed: ({ clientName, expertName, date, slotStart, slotEnd, fee }) =>
    baseTemplate(`
      <p class="title">Booking Confirmed ✅</p>
      <p class="subtitle">Hi <strong>${clientName}</strong>, great news! Your consultation has been confirmed by the expert.</p>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">Expert</span>
          <span class="detail-value">${expertName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${slotStart} – ${slotEnd}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Consultation Fee</span>
          <span class="detail-value">₹${fee}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value"><span class="badge badge-confirmed">Confirmed</span></span>
        </div>
      </div>
      <p style="font-size:14px;color:#8a8780;">Please be available at the scheduled time. You can view all your bookings from My Bookings.</p>
    `),

  // Sent to the other party when booking is cancelled
  bookingCancelled: ({ recipientName, otherPartyName, otherPartyRole, date, slotStart, slotEnd, reason }) =>
    baseTemplate(`
      <p class="title">Booking Cancelled ❌</p>
      <p class="subtitle">Hi <strong>${recipientName}</strong>, your consultation booking has been cancelled by the ${otherPartyRole}.</p>
      <div class="detail-box">
        <div class="detail-row">
          <span class="detail-label">${otherPartyRole === 'expert' ? 'Expert' : 'Client'}</span>
          <span class="detail-value">${otherPartyName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${slotStart} – ${slotEnd}</span>
        </div>
        ${reason ? `
        <div class="detail-row">
          <span class="detail-label">Reason</span>
          <span class="detail-value">${reason}</span>
        </div>` : ''}
        <div class="detail-row">
          <span class="detail-label">Status</span>
          <span class="detail-value"><span class="badge badge-cancelled">Cancelled</span></span>
        </div>
      </div>
      <p style="font-size:14px;color:#8a8780;">If you have questions, please contact support. You can book another consultation anytime.</p>
    `),
};

// ─── Send Function ────────────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html }) => {
  // Skip silently if email credentials not configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    logger.warn('Email not sent — EMAIL_HOST or EMAIL_USER not configured');
    return null;
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'LExperts <noreply@lexperts.com>',
      to,
      subject,
      html,
    });

    // In development, log the Ethereal preview URL so you can view the email
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`Email preview (Ethereal): ${previewUrl}`, { to, subject });
      }
    }

    logger.info('Email sent', { to, subject, messageId: info.messageId });
    return info;
  } catch (err) {
    // Never crash the server because of an email failure
    logger.error('Failed to send email', { to, subject, error: err.message });
    return null;
  }
};

// ─── Exported helpers ─────────────────────────────────────────────────────────

const sendBookingCreatedEmail = async (booking, expertEmail, clientName, expertName) => {
  const date = booking.date
    ? new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return sendEmail({
    to: expertEmail,
    subject: `New Booking Request from ${clientName} — LExperts`,
    html: templates.bookingCreated({
      expertName,
      clientName,
      date,
      slotStart: booking.slot?.start || 'N/A',
      slotEnd:   booking.slot?.end   || 'N/A',
      fee:       booking.consultationFeeAtBooking || 'N/A',
    }),
  });
};

const sendBookingConfirmedEmail = async (booking, clientEmail, clientName, expertName) => {
  const date = booking.date
    ? new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return sendEmail({
    to: clientEmail,
    subject: `Your Booking with ${expertName} is Confirmed — LExperts`,
    html: templates.bookingConfirmed({
      clientName,
      expertName,
      date,
      slotStart: booking.slot?.start || 'N/A',
      slotEnd:   booking.slot?.end   || 'N/A',
      fee:       booking.consultationFeeAtBooking || 'N/A',
    }),
  });
};

const sendBookingCancelledEmail = async (booking, recipientEmail, recipientName, otherPartyName, otherPartyRole, reason) => {
  const date = booking.date
    ? new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  return sendEmail({
    to: recipientEmail,
    subject: `Booking Cancelled — LExperts`,
    html: templates.bookingCancelled({
      recipientName,
      otherPartyName,
      otherPartyRole,
      date,
      slotStart: booking.slot?.start || 'N/A',
      slotEnd:   booking.slot?.end   || 'N/A',
      reason,
    }),
  });
};

module.exports = {
  sendBookingCreatedEmail,
  sendBookingConfirmedEmail,
  sendBookingCancelledEmail,
};
