// src/server.js

const dotenv = require('dotenv');
dotenv.config();

const { validateEnvironment } = require('./config/environment');
const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;
let server;

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  logger.info(`MongoDB connected: ${conn.connection.host}`);
};

const startServer = async () => {
  // Validate environment at startup
  validateEnvironment();
  await connectDB();
  server = app.listen(PORT, () => {
    logger.info(`LExperts API running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });

  // Start background jobs
  const { startPaymentExpiryJob } = require('./utils/scheduler');
  startPaymentExpiryJob();
};

const shutdown = async (signal) => {
  logger.warn(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (err) => {
  logger.error(`UNHANDLED REJECTION: ${err.message}`, { stack: err.stack });
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error(`UNCAUGHT EXCEPTION: ${err.message}`, { stack: err.stack });
  process.exit(1);
});

startServer();
