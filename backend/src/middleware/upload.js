// src/middleware/upload.js
// Multer configs for file uploads.
// In production (AWS) swap diskStorage for multer-s3.

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AppError = require('../utils/AppError');

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// ─── Booking documents ────────────────────────────────────────────────────────

const bookingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/bookings'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?._id?.toString() || 'unknown';
    cb(null, `${Date.now()}-${userId}${ext}`);
  },
});

const upload = multer({
  storage: bookingStorage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF, JPG, and PNG files are allowed', 400), false);
    }
  },
  limits: { fileSize: MAX_FILE_SIZE, files: 3 },
});

// ─── Sanad (expert credential) upload ────────────────────────────────────────

const sanadDir = path.join(__dirname, '../../uploads/sanad');
if (!fs.existsSync(sanadDir)) fs.mkdirSync(sanadDir, { recursive: true });

const sanadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, sanadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?._id?.toString() || 'unknown';
    cb(null, `sanad-${userId}-${Date.now()}${ext}`);
  },
});

const sanadUpload = multer({
  storage: sanadStorage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF, JPG, and PNG files are allowed', 400), false);
    }
  },
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

// ─── Shared error handler ─────────────────────────────────────────────────────

const handleMulterError = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return next(new AppError('File must be under 5 MB', 400));
    if (err.code === 'LIMIT_FILE_COUNT')
      return next(new AppError('Only one file allowed', 400));
    return next(new AppError(`Upload error: ${err.message}`, 400));
  }
  next(err);
};

module.exports = { upload, sanadUpload, handleMulterError };
