// src/modules/admin/admin.controller.js

const adminService = require('./admin.service');
const catchAsync = require('../../utils/catchAsync');

const getStats = catchAsync(async (req, res) => {
  const stats = await adminService.getStats();
  res.status(200).json({ success: true, data: stats });
});

const getUsers = catchAsync(async (req, res) => {
  const result = await adminService.getUsers(req.query);
  res.status(200).json({ success: true, data: result });
});

const deactivateUser = catchAsync(async (req, res) => {
  const user = await adminService.toggleUserActive(req.params.id, false);
  res.status(200).json({ success: true, message: 'User deactivated', data: { user } });
});

const activateUser = catchAsync(async (req, res) => {
  const user = await adminService.toggleUserActive(req.params.id, true);
  res.status(200).json({ success: true, message: 'User activated', data: { user } });
});

const getExperts = catchAsync(async (req, res) => {
  const result = await adminService.getExperts(req.query);
  res.status(200).json({ success: true, data: result });
});

const approveExpert = catchAsync(async (req, res) => {
  const expert = await adminService.approveExpert(req.params.id);
  res.status(200).json({ success: true, message: 'Expert approved successfully', data: { expert } });
});

const rejectExpert = catchAsync(async (req, res) => {
  const expert = await adminService.rejectExpert(req.params.id, req.body.reason);
  res.status(200).json({ success: true, message: 'Expert rejected', data: { expert } });
});

const getBookings = catchAsync(async (req, res) => {
  const result = await adminService.getBookings(req.query);
  res.status(200).json({ success: true, data: result });
});

module.exports = { getStats, getUsers, deactivateUser, activateUser, getExperts, approveExpert, rejectExpert, getBookings };
