export const shortenerConfig = {
  codeLength: parseInt(process.env.SHORT_CODE_LENGTH || '8'),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || [],
  blacklistedDomains: process.env.BLACKLISTED_DOMAINS?.split(',') || [],
};