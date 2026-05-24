import dotenv from 'dotenv';

dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? 'development';

const requiredEnvVars = ['DATABASE_URL', 'EMAIL_KEY'];

if (nodeEnv === 'production') {
  requiredEnvVars.push('ACCESS_TOKEN_SECRET');
}

// Validate required environment variables
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL!,
  emailKey: process.env.EMAIL_KEY!,
  accessTokenSecret:
    process.env.ACCESS_TOKEN_SECRET ??
    'development-only-authservice-access-token-secret-change-me',
  accessTokenTtlSeconds: parseInt(
    process.env.ACCESS_TOKEN_TTL_SECONDS ?? '900',
    10,
  ),
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '30', 10),
  verificationTokenTtlMinutes: parseInt(
    process.env.VERIFICATION_TOKEN_TTL_MINUTES ?? '15',
    10,
  ),
  passwordResetTokenTtlMinutes: parseInt(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? '15',
    10,
  ),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  gatewaySharedSecret: process.env.GATEWAY_SHARED_SECRET,
};

export default config;
