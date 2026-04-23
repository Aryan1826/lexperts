// src/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../modules/user/user.model');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const protect = catchAsync(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) throw new AppError('Authentication required. Please log in.', 401);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') throw new AppError('Session expired. Please log in again.', 401);
    throw new AppError('Invalid token. Please log in again.', 401);
  }

  const user = await User.findById(decoded.id);
  if (!user) throw new AppError('User no longer exists', 401);
  if (!user.isActive) throw new AppError('Your account has been deactivated', 403);
  if (user.changedPasswordAfter(decoded.iat)) {
    throw new AppError('Password was recently changed. Please log in again.', 401);
  }

  req.user = user;
  next();
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = { protect, restrictTo };