// src/modules/auth/auth.service.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../user/user.model');
const AppError = require('../../utils/AppError');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../../utils/emailService');

const signAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
};

const signRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
};

const createTokenPair = async (user) => {
  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken };
};

const register = async ({ name, email, password, role }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new AppError('Email is already registered', 409);

  const allowedRoles = ['client', 'expert'];
  const assignedRole = allowedRoles.includes(role) ? role : 'client';

  const user = await User.create({ name, email, password, role: assignedRole });

  // Send welcome email — fire-and-forget, never blocks registration
  sendWelcomeEmail(user).catch(() => {});

  const tokens = await createTokenPair(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    ...tokens,
  };
};

const login = async ({ email, password }) => {
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) throw new AppError('Your account has been deactivated', 403);

  const tokens = await createTokenPair(user);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    ...tokens,
  };
};

const refreshTokens = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) throw new AppError('Refresh token is required', 400);

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new AppError('Refresh token is invalid or has been rotated', 401);
  }

  const tokens = await createTokenPair(user);
  return tokens;
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const forgotPassword = async ({ email }) => {
  if (!email) throw new AppError('Please provide your email address', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always respond the same way — don't reveal if email exists or not (security)
  if (!user) return;

  // Generate raw token (sent in email) and hashed token (stored in DB)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  // Send reset email — if it fails, clear the token so user can try again
  try {
    await sendPasswordResetEmail(user, rawToken);
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Failed to send reset email. Please try again.', 500);
  }
};

const resetPassword = async ({ token, password }) => {
  if (!token || !password) throw new AppError('Token and new password are required', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);

  // Hash the incoming token and match against DB
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }, // not expired
  });

  if (!user) throw new AppError('Reset link is invalid or has expired. Please request a new one.', 400);

  // Set new password and clear reset fields
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

module.exports = { register, login, refreshTokens, logout, getMe, forgotPassword, resetPassword };