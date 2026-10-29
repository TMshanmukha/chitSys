import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';


const app = express();

// Trust proxy for rate limiting behind reverse proxy if applicable
app.set('trust proxy', 1);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible API usage
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Configuration
const isDev = env.NODE_ENV === 'development';
const configuredOrigins = env.FRONTEND_ORIGIN
  ? env.FRONTEND_ORIGIN.split(',').map((o) => o.trim())
  : [];

const allowedOrigins = [
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, or server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // In development mode, allow any localhost or 127.0.0.1 port
    if (isDev && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Automatically allow any Vercel deployment domain (*.vercel.app)
    try {
      const parsedUrl = new URL(origin);
      if (parsedUrl.hostname.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    } catch (e) {
      // Ignore URL parse errors
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    logger.warn(`CORS rejected origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['set-cookie'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));



// Body Parsing & Cookies
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Request logging (sanitized)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Root & Health check endpoints for cloud platforms (Back4App, Docker, Koyeb)
app.get(['/', '/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'chitfund-backend',
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/notifications', notificationRoutes);


// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' does not exist.`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Server Startup
async function startServer() {
  logger.info('🚀 Starting Chit Fund Management Backend Server...');

  // Start HTTP listener immediately so cloud health checks (Back4App) succeed in <100ms
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info(`✨ Server running on http://0.0.0.0:${env.PORT}`);
    logger.info(`🔒 Allowed Frontend Origin: ${env.FRONTEND_ORIGIN}`);
    logger.info(`🌐 Health check available at: http://0.0.0.0:${env.PORT}/`);
  });

  // Handle server-level errors such as port collisions gracefully
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`❌ Port ${env.PORT} is already in use by another running process.`);
      logger.info(`💡 Please terminate any existing node processes using port ${env.PORT} or change PORT in .env.`);
    } else {
      logger.error(`❌ Server listener error: ${err.message}`);
    }
    process.exit(1);
  });

  // Test MySQL connection and optionally run migrations in background
  (async () => {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('⚠️ Server started without active MySQL connection. Some routes will fail until database is available.');
    } else if (env.AUTO_MIGRATE === 'true') {
      try {
        const { runMigrations } = await import('./scripts/migrate.js');
        await runMigrations();
        logger.info('✅ Auto-migrations completed on startup.');
      } catch (migErr) {
        logger.error('❌ Auto-migration error on startup:', { message: migErr.message });
      }
    }
  })();

  // Graceful shutdown
  const shutdown = () => {
    logger.info('Shutting down server gracefully...');
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Only start when executed directly (not when imported for tests)
import { fileURLToPath } from 'url';
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  startServer();
}

export { app, startServer };
export default app;

