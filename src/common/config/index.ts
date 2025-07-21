export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/links',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },

  // Application
  app: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // Cache settings
  cache: {
    visitsThreshold: parseInt(process.env.CACHE_VISITS_THRESHOLD || '5'),
    defaultExpirationHours: parseInt(
      process.env.CACHE_DEFAULT_EXPIRATION_HOURS || '6',
    ),
  },

  // Rate limiting
  throttle: {
    limit: parseInt(process.env.THROTTLE_LIMIT || '10'),
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS || '60000'), // 60 seconds
  },

  // Link generation
  link: {
    codeLength: parseInt(process.env.LINK_CODE_LENGTH || '7'),
  },
};
