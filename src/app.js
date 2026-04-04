// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const logger = require('./utils/logger');
const requestId = require('./middleware/requestId.middleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// ─── Request ID (must be first so all logs carry it) ─────────────────────────
app.use(requestId);

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// ALLOWED_ORIGINS env var holds comma-separated origins.
// Development default: localhost:5173
// Production: set ALLOWED_ORIGINS=https://yourdomain.com in EC2 environment
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin) and whitelisted origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} is not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// ─── Rate limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// ─── Request logging via Winston stream ───────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
      stream: logger.stream,
    })
  );
}

// ─── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── NoSQL injection sanitization ────────────────────────────────────────────
// Custom middleware to prevent NoSQL injection by removing keys with '$' and '.'
// (express-mongo-sanitize is incompatible with Express v5)
const sanitizeData = (data) => {
  if (typeof data !== 'object' || data === null) return data;
  const sanitized = Array.isArray(data) ? [...data] : { ...data };
  for (const key in sanitized) {
    if (key.includes('$') || key.includes('.')) {
      delete sanitized[key];
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  }
  return sanitized;
};

app.use((req, res, next) => {
  req.body = sanitizeData(req.body);
  req.query = sanitizeData(req.query);
  req.params = sanitizeData(req.params);
  next();
});

// ─── Static files — uploaded documents ───────────────────────────────────────
// Served at: GET /uploads/bookings/<filename>
// Helmet blocks cross-origin reads so only our frontend (same origin in prod) can access them.
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), { maxAge: '1d' })
);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'LExperts API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', require('./modules/auth/auth.routes'));
app.use('/api/v1/experts', require('./modules/expert/expert.routes'));
app.use('/api/v1/bookings', require('./modules/booking/booking.routes'));

// ─── Error handlers (must be last) ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
