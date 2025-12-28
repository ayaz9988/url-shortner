import { config } from 'dotenv';

// Load environment variables
config();

// Validate critical environment variables
function validateEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate JWT secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  
  // Validate port range
  const port = Number(process.env.PORT) || 3000;
  if (port < 1 || port > 65535) {
    throw new Error('PORT must be between 1 and 65535');
  }
}

validateEnv();

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-session',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  rateLimitTimeWindow: Number(process.env.RATE_LIMIT_TIME_WINDOW) || 15,
  maxUrlLength: Number(process.env.MAX_URL_LENGTH) || 2048,
  defaultExpiryDays: Number(process.env.DEFAULT_EXPIRY_DAYS) || 90,
  maxRequestsPerHour: Number(process.env.MAX_REQUESTS_PER_HOUR) || 100,
  maxRequestsPerDay: Number(process.env.MAX_REQUESTS_PER_DAY) || 1000,
  burstLimit: Number(process.env.BURST_LIMIT) || 20,
  geoipCityPath: process.env.GEOIP_CITY_PATH || './GeoLite2-City.mmdb',
  codeLength: parseInt(process.env.SHORT_CODE_LENGTH || '8'),
  allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || [],
  blacklistedDomains: process.env.BLACKLISTED_DOMAINS?.split(',') || [],
};