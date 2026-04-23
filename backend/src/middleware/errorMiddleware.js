// src/middleware/errorMiddleware.js

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const handleCastErrorDB = (err) => new AppError(`Invalid ${err.path}: ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists. Please use a different value.`, 409);
};

const handleValidationErrorDB = (err) => {
  const messages = Object.values(err.errors).map((e) => e.message).join(', ');
  return new AppError(messages, 422);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () => new AppError('Session expired. Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    success: false,
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      requestId: req.requestId,
      message: err.message,
    });
  } else {
    // Unexpected error — log full details, hide from client
    logger.error('UNEXPECTED ERROR', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      message: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      success: false,
      requestId: req.requestId,
      message: 'Something went wrong. Please try again later.',
    });
  }
};

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;

  let error = { ...err, message: err.message, stack: err.stack };

  if (error.name === 'CastError') error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

  // Log all 5xx errors at error level, 4xx at warn level
  if (error.statusCode >= 500) {
    logger.error(error.message, { requestId: req.requestId, stack: error.stack });
  } else if (error.statusCode >= 400) {
    logger.warn(error.message, { requestId: req.requestId, url: req.originalUrl });
  }

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

module.exports = { notFound, errorHandler };
