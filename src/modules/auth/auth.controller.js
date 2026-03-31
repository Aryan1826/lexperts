// src/modules/auth/auth.controller.js

const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');

// 🔐 Cookie options for both access and refresh tokens
// httpOnly: Prevents JavaScript access (protects against XSS)
// secure: Only sent over HTTPS in production
// sameSite: Prevents CSRF attacks
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

// Access token expires in 15 minutes (short-lived)
const accessTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 15 * 60 * 1000,
};

// Refresh token expires in 7 days (long-lived)
const refreshTokenCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await authService.register({ name, email, password, role });

  // 🔐 Set both tokens as httpOnly cookies
  res.cookie('accessToken', result.accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions);

  // ✅ Also return accessToken in JSON for immediate frontend response
  // Frontend will prefer the cookie for subsequent requests
  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: result.user,
      accessToken: result.accessToken, // Available for frontend use or cache
    },
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  // 🔐 Set both tokens as httpOnly cookies
  res.cookie('accessToken', result.accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions);

  // ✅ Also return accessToken in JSON for immediate frontend response
  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken, // Available for frontend use or cache
    },
  });
});

const refresh = catchAsync(async (req, res) => {
  // Try to get refresh token from cookies first, then fallback to body
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  const tokens = await authService.refreshTokens(incomingRefreshToken);

  // 🔐 Set both new tokens as httpOnly cookies
  res.cookie('accessToken', tokens.accessToken, accessTokenCookieOptions);
  res.cookie('refreshToken', tokens.refreshToken, refreshTokenCookieOptions);

  // ✅ Also return accessToken in JSON for frontend response
  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: { accessToken: tokens.accessToken }, // Frontend can use this if needed
  });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id);

  // 🔐 Clear both token cookies
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

const getMe = catchAsync(async (req, res) => {
  const user = await authService.getMe(req.user._id);

  res.status(200).json({
    success: true,
    data: { user },
  });
});

module.exports = { register, login, refresh, logout, getMe };