// src/utils/logger.js

const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const { combine, timestamp, printf, colorize, errors, json } = format;

const logDir = path.join(__dirname, '../../logs');

// Human-readable format for development
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, requestId, stack }) => {
    const reqId = requestId ? ` [${requestId}]` : '';
    return `${timestamp}${reqId} ${level}: ${stack || message}`;
  })
);

// JSON format for production (structured, machine-parseable)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    // Console — always on
    new transports.Console(),

    // Rotating error log — errors only
    new transports.DailyRotateFile({
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),

    // Rotating combined log — all levels
    new transports.DailyRotateFile({
      dirname: logDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
  // Do not exit on handled exceptions
  exitOnError: false,
});

// Morgan stream integration
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;
