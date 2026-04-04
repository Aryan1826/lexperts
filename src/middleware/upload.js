// src/middleware/upload.js
// Multer config for booking document uploads.
// Stores files locally under uploads/bookings/
// In production (AWS) swap diskStorage for multer-s3.

const multer = require('multer');
const path = require('path');
const AppError = require('../utils/AppError');

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB per file
const MAX_FILES = 3;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/bookings'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const userId = req.user?._id?.toString() || 'unknown';
    cb(null, `${Date.now()}-${userId}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF, JPG, and PNG files are allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

// Multer error → AppError so global handler formats it correctly
const handleMulterError = (err, _req, _res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return next(new AppError('Each file must be under 5 MB', 400));
    if (err.code === 'LIMIT_FILE_COUNT')
      return next(new AppError(`Maximum ${MAX_FILES} files allowed`, 400));
    return next(new AppError(`Upload error: ${err.message}`, 400));
  }
  next(err);
};

module.exports = { upload, handleMulterError };
