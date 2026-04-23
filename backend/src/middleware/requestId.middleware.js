// src/middleware/requestId.middleware.js
// Attaches a unique ID to every request for end-to-end log tracing.

const { randomUUID } = require('crypto');

const requestId = (req, res, next) => {
  // Honor upstream request ID (e.g. from Nginx or a load balancer) if present
  req.requestId = req.headers['x-request-id'] || randomUUID();

  // Expose it in the response so the client/frontend can correlate errors
  res.setHeader('X-Request-Id', req.requestId);

  next();
};

module.exports = requestId;
