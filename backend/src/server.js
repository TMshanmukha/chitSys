import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { testConnection } from './config/db.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


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

    // Allow any origin if wildcard is set in FRONTEND_ORIGIN
    if (configuredOrigins.includes('*') || env.FRONTEND_ORIGIN === '*') {
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

// Health check endpoints for cloud monitoring
app.get(['/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'chitfund-backend',
    version: '1.0.0',
    environment: env.NODE_ENV,
  });
});

// Mount Routes (support both /api/path and /path in case proxy rewrites differ)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/admin', '/admin'], adminRoutes);
app.use(['/api/agent', '/agent'], agentRoutes);
app.use(['/api/notifications', '/notifications'], notificationRoutes);


// Serve frontend static assets (Vite production build)
const candidateDistDirs = [
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname, '../../../frontend/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../frontend/dist'),
];
const distDir = candidateDistDirs.find((d) => {
  try {
    return fs.existsSync(d) && fs.existsSync(path.join(d, 'index.html'));
  } catch (_) {
    return false;
  }
});

if (distDir) {
  logger.info(`Serving static frontend build from: ${distDir}`);
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  // Graceful fallback for root and index.html in serverless environment
  app.get(['/', '/index.html'], (req, res) => {
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ChitFund Pro - Loading</title>
  <meta http-equiv="refresh" content="1; url=/" />
  <style>
    body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: #131b2e; border: 1px solid #1e293b; padding: 2rem; border-radius: 12px; text-align: center; max-width: 420px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h1 { color: #f59e0b; font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
    .btn { display: inline-block; margin-top: 1rem; padding: 0.6rem 1.4rem; background: #f59e0b; color: #000; font-weight: 600; text-decoration: none; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>ChitFund Pro</h1>
    <p>Application is initializing. If you are not redirected automatically, click below to open ChitFund Pro.</p>
    <a href="/" class="btn">Open App</a>
  </div>
</body>
</html>`);
  });

  // Catch-all for non-API routes when static dir is unbundled
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.redirect('/');
  });
}

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

  // Also bind to port 80 and 8080 if permitted so any cloud platform port setting works
  const alternatePorts = [80, 8080].filter((p) => p !== env.PORT);
  for (const altPort of alternatePorts) {
    try {
      const altServer = app.listen(altPort, '0.0.0.0', () => {
        logger.info(`✨ Cloud health probe listener active on http://0.0.0.0:${altPort}/`);
      });
      altServer.on('error', () => {
        // Silently skip if alternate port cannot be bound (e.g. non-root on local dev)
      });
    } catch (_) {
      // Silently ignore
    }
  }

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

// Only start when executed directly (not when imported for tests or Vercel serverless)
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  startServer();
}

export { app, startServer };
export default app;

