import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',

  databaseUrl: process.env.DATABASE_URL!,

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisPassword: process.env.REDIS_PASSWORD,

  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET!,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',

  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
  lockoutDuration: parseInt(process.env.LOCKOUT_DURATION || '15'),

  cricketApiKey: process.env.CRICKET_API_KEY || '',
  cricketApiUrl: process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1',

  maxBetAmount: parseFloat(process.env.MAX_BET_AMOUNT || '100000'),
  minBetAmount: parseFloat(process.env.MIN_BET_AMOUNT || '10'),
  defaultCreditLimit: parseFloat(process.env.DEFAULT_CREDIT_LIMIT || '10000'),

  agentCommission: parseFloat(process.env.AGENT_COMMISSION || '1.0'),
  masterAgentCommission: parseFloat(process.env.MASTER_AGENT_COMMISSION || '0.5'),
  superMasterCommission: parseFloat(process.env.SUPER_MASTER_COMMISSION || '0.3'),
  platformCommission: parseFloat(process.env.PLATFORM_COMMISSION || '0.2'),

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
