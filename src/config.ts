import { config } from 'dotenv';

// Load environment variables
config();

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