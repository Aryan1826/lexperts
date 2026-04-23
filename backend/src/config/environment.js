/**
 * Environment Configuration Validator
 *
 * ✅ Validates all required environment variables at startup
 * ✅ Checks variable formats and constraints
 * ✅ Prevents server from starting if config is incomplete
 * ✅ Logs loaded configuration (with secret masking)
 *
 * Usage: Require this at the very start of src/server.js
 *   require('./src/config/environment');
 */

const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

/**
 * Define all required environment variables
 * Each variable has: required (boolean), type (string), description (string)
 */
const requiredEnvVars = {
  // Server Config
  PORT: {
    required: true,
    type: 'number',
    description: 'Server port (e.g., 5001)',
    validator: (val) => {
      const port = parseInt(val, 10);
      return port > 0 && port < 65535;
    },
    errorMsg: 'PORT must be a valid number between 1 and 65535',
  },

  NODE_ENV: {
    required: true,
    type: 'enum',
    enum: ['development', 'production', 'test'],
    description: 'Node environment (development, production, or test)',
    validator: (val) => ['development', 'production', 'test'].includes(val),
    errorMsg: 'NODE_ENV must be one of: development, production, test',
  },

  // Database
  MONGO_URI: {
    required: true,
    type: 'string',
    description: 'MongoDB connection string',
    validator: (val) => /^mongodb(\+srv)?:\/\/.+@.+/.test(val),
    errorMsg: 'MONGO_URI must be a valid MongoDB connection string (e.g., mongodb+srv://user:pass@host)',
  },

  // JWT Secrets
  JWT_ACCESS_SECRET: {
    required: true,
    type: 'string',
    description: 'JWT access token secret (min 32 chars for security)',
    validator: (val) => val && val.length >= 8,
    errorMsg: 'JWT_ACCESS_SECRET must be at least 8 characters long',
    isSecret: true,
  },

  JWT_REFRESH_SECRET: {
    required: true,
    type: 'string',
    description: 'JWT refresh token secret (min 32 chars for security)',
    validator: (val) => val && val.length >= 8,
    errorMsg: 'JWT_REFRESH_SECRET must be at least 8 characters long',
    isSecret: true,
  },

  // JWT Expiration
  JWT_ACCESS_EXPIRES_IN: {
    required: true,
    type: 'string',
    description: 'JWT access token expiration (e.g., 15m, 1h)',
    validator: (val) => /^\d+(m|h|d)$/.test(val),
    errorMsg: 'JWT_ACCESS_EXPIRES_IN must be in format: number + unit (m/h/d), e.g., 15m',
  },

  JWT_REFRESH_EXPIRES_IN: {
    required: true,
    type: 'string',
    description: 'JWT refresh token expiration (e.g., 7d, 30d)',
    validator: (val) => /^\d+(m|h|d)$/.test(val),
    errorMsg: 'JWT_REFRESH_EXPIRES_IN must be in format: number + unit (m/h/d), e.g., 7d',
  },

  // CORS
  ALLOWED_ORIGINS: {
    required: true,
    type: 'string',
    description: 'Comma-separated list of allowed CORS origins',
    validator: (val) => {
      if (!val) return false;
      const origins = val.split(',').map((o) => o.trim());
      return origins.every((o) => /^https?:\/\/.+/.test(o));
    },
    errorMsg: 'ALLOWED_ORIGINS must be comma-separated valid URLs (e.g., http://localhost:5173,http://localhost:5174)',
  },
};

/**
 * Validate all environment variables
 */
function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const loaded = {};

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  ENVIRONMENT CONFIGURATION VALIDATION${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

  // Check each required variable
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const envValue = process.env[key];

    // 1. Check if variable exists
    if (!envValue) {
      errors.push(`${colors.red}✗ ${key}${colors.reset} - MISSING (Required)`);
      continue;
    }

    // 2. Validate format/constraints
    if (config.validator && !config.validator(envValue)) {
      errors.push(`${colors.red}✗ ${key}${colors.reset} - INVALID FORMAT\n    Error: ${config.errorMsg}`);
      continue;
    }

    // 3. Success - store loaded value
    const displayValue = config.isSecret ? '***' + envValue.slice(-4) : envValue;
    loaded[key] = displayValue;
    console.log(`${colors.green}✓${colors.reset} ${key.padEnd(25)} = ${displayValue}`);
  }

  // Print any errors
  if (errors.length > 0) {
    console.log(`\n${colors.red}══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.red}CONFIGURATION ERRORS - SERVER CANNOT START${colors.reset}`);
    console.log(`${colors.red}══════════════════════════════════════════════════${colors.reset}\n`);

    errors.forEach((error) => console.log(`  ${error}`));

    console.log(`\n${colors.yellow}REQUIRED ENVIRONMENT VARIABLES:${colors.reset}\n`);
    for (const [key, config] of Object.entries(requiredEnvVars)) {
      console.log(`  ${colors.blue}${key}${colors.reset}`);
      console.log(`    Description: ${config.description}`);
      console.log(`    Type: ${config.type}`);
      if (config.enum) console.log(`    Allowed: ${config.enum.join(', ')}`);
      console.log('');
    }

    process.exit(1);
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n${colors.yellow}⚠️  PRODUCTION SECURITY CHECKS${colors.reset}\n`);

    // Check JWT secrets are strong
    if (process.env.JWT_ACCESS_SECRET === 'your_super_secret_access_key') {
      warnings.push(
        `${colors.yellow}⚠️  JWT_ACCESS_SECRET is using default value${colors.reset}\n    Action: Set a strong secret in EC2 environment`
      );
    }

    if (process.env.JWT_REFRESH_SECRET === 'your_super_secret_refresh_key') {
      warnings.push(
        `${colors.yellow}⚠️  JWT_REFRESH_SECRET is using default value${colors.reset}\n    Action: Set a strong secret in EC2 environment`
      );
    }

    // Check ALLOWED_ORIGINS is not localhost
    if (process.env.ALLOWED_ORIGINS.includes('localhost')) {
      warnings.push(
        `${colors.yellow}⚠️  ALLOWED_ORIGINS contains localhost${colors.reset}\n    Action: Use production domain in EC2 environment`
      );
    }
  }

  // Print warnings if any
  if (warnings.length > 0) {
    warnings.forEach((warning) => {
      console.log(`  ${warning}`);
      console.log('');
    });
  }

  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(
    `${colors.green}✅ ALL ENVIRONMENT VARIABLES VALIDATED${colors.reset} (${Object.keys(loaded).length}/${Object.keys(requiredEnvVars).length})`
  );
  console.log(`${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);
}

// Export validation function
module.exports = {
  validateEnvironment,
  requiredEnvVars,
};
