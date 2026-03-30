// src/modules/auth/auth.controller.js

const authService = require('./auth.service');
const catchAsync = require('../../utils/catchAsync');

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const register = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;
  const result = await authService.register({ name, email, password, role });

  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });

  res.cookie('refreshToken', result.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

const refresh = catchAsync(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  const tokens = await authService.refreshTokens(incomingRefreshToken);

  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: 'Token refreshed',
    data: { accessToken: tokens.accessToken },
  });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.user._id);

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