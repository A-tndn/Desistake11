import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config';
import logger from './config/logger';
import { connectRedis } from './db/redis';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiter';
import { sanitizeRequest, additionalSecurityHeaders } from './middleware/security';

// Cron Jobs
import { startBetSettlementJob, startBetVoidJob } from './jobs/betSettlement.job';
import { startWeeklySettlementJob, startMonthlySettlementJob } from './jobs/settlementGeneration.job';
import { startNotificationCleanupJob } from './jobs/notificationCleanup.job';
import { startOddsScraperJob } from './jobs/oddsScraper.job';
import { startScoreScraperJob } from './jobs/scoreScraper.job';
import { startAutoSettlementJob } from './jobs/autoSettlement.job';

// Routes
import authRoutes from './routes/auth.routes';
import matchRoutes from './routes/match.routes';
import betRoutes from './routes/bet.routes';
import agentRoutes from './routes/agent.routes';
import masterRoutes from './routes/master.routes';
import adminRoutes from './routes/admin.routes';
import depositRoutes from './routes/deposit.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import casinoRoutes from './routes/casino.routes';
import notificationRoutes from './routes/notification.routes';
import analyticsRoutes from './routes/analytics.routes';
import supportRoutes from './routes/support.routes';
import fancyMarketRoutes from './routes/fancyMarket.routes';
import agentBetRoutes from './routes/agent-bet.routes';

const app: Application = express();
const httpServer = createServer(app);

// Socket.io setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ============================================
// SECURITY MIDDLEWARE STACK
// ============================================

// Trust proxy (for rate limiters behind Nginx/load balancer)
app.set('trust proxy', 1);

// Helmet — security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'wss:', 'ws:', ...(Array.isArray(config.corsOrigin) ? config.corsOrigin : [config.corsOrigin])],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Additional security headers
app.use(additionalSecurityHeaders);

// CORS
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // Cache preflight for 24 hours
}));

// Body parsing with size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Sanitize incoming requests
app.use(sanitizeRequest);

// Global API rate limiting
app.use('/api', apiLimiter);

// ============================================
// HEALTH & READINESS
// ============================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

app.get('/ready', async (_req, res) => {
  try {
    // Check database connection
    const { default: prisma } = await import('./db');
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ready', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'not ready', database: 'disconnected' });
  }
});

// ============================================
// API ROUTES
// ============================================

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/matches', matchRoutes);
app.use('/api/v1/bets', betRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/master', masterRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/deposits', depositRoutes);
app.use('/api/v1/withdrawals', withdrawalRoutes);
app.use('/api/v1/casino', casinoRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1', fancyMarketRoutes);
app.use('/api/v1/agent-bets', agentBetRoutes);

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handler
app.use(errorHandler);

// ============================================
// SOCKET.IO
// ============================================

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join-match', (matchId: string) => {
    socket.join(`match:${matchId}`);
    logger.debug(`Socket ${socket.id} joined match:${matchId}`);
  });

  socket.on('leave-match', (matchId: string) => {
    socket.leave(`match:${matchId}`);
  });

  socket.on('join-user', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.debug(`Socket ${socket.id} joined user:${userId}`);
  });

  socket.on('join-admin', (agentId: string) => {
    socket.join(`admin:${agentId}`);
    logger.debug(`Socket ${socket.id} joined admin:${agentId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`Socket disconnected: ${socket.id}`);
  });
});

// Export io for use in other modules
export { io };

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
  try {
    // Connect to Redis
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (error) {
      logger.warn('Redis connection failed, continuing without cache');
    }

    // Start cron jobs
    startBetSettlementJob();
    startBetVoidJob();
    startWeeklySettlementJob();
    startMonthlySettlementJob();
    startNotificationCleanupJob();
    startOddsScraperJob();
    startScoreScraperJob();
    startAutoSettlementJob();

    // Start HTTP server
    httpServer.listen(config.port, () => {
      logger.info(`Server running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`API Base URL: ${config.apiBaseUrl}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      // Force exit after 10 seconds
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
