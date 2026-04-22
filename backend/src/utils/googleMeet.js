// src/utils/googleMeet.js
// Generates a Google Meet link via Google Calendar API.
// Falls back to a Jitsi Meet link if Google credentials are not configured.

const { google } = require('googleapis');
const logger = require('./logger');

/**
 * Returns a Google Meet link for the booking.
 * Requires GOOGLE_SERVICE_ACCOUNT_KEY env var (JSON stringified service account key).
 *
 * Fallback: if credentials not set, returns a free Jitsi Meet link.
 */
const createMeetLink = async (booking, clientName, expertName) => {
  const bookingId = booking._id.toString();

  // ── Fallback: Jitsi Meet (no credentials needed) ─────────────────────────
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY === 'REPLACE_ME') {
    const jitsiLink = `https://meet.jit.si/lexperts-${bookingId}`;
    logger.info('Google credentials not configured — using Jitsi Meet fallback', { bookingId, jitsiLink });
    return jitsiLink;
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Build ISO datetime in IST by passing timeZone to the API
    const startDateTime = `${booking.date}T${booking.slot.start}:00`;
    const endDateTime   = `${booking.date}T${booking.slot.end}:00`;

    const event = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      conferenceDataVersion: 1,
      requestBody: {
        summary:     `LExperts: ${clientName} × ${expertName}`,
        description: `Legal consultation via LExperts. Booking ID: ${bookingId}`,
        start: { dateTime: startDateTime, timeZone: 'Asia/Kolkata' },
        end:   { dateTime: endDateTime,   timeZone: 'Asia/Kolkata' },
        conferenceData: {
          createRequest: {
            requestId: `lexperts-${bookingId}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetLink = event.data.hangoutLink;
    logger.info('Google Meet link created', { bookingId, meetLink });
    return meetLink || `https://meet.jit.si/lexperts-${bookingId}`;

  } catch (err) {
    logger.error('Failed to create Google Meet link, falling back to Jitsi', { bookingId, error: err.message });
    return `https://meet.jit.si/lexperts-${bookingId}`;
  }
};

module.exports = { createMeetLink };
