import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-prod',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  rateLimit: {
    auth: {
      ttl: parseInt(process.env.RATE_LIMIT_AUTH_TTL || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '10', 10),
    },
    global: {
      ttl: parseInt(process.env.RATE_LIMIT_GLOBAL_TTL || '60000', 10),
      max: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX || '100', 10),
    },
  },
}));
