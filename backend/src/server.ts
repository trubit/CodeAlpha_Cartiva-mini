import dns from 'dns';
import type { Server } from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {
  // Ignore in environments where not supported
}

const app = createApp();

const server: Server = app.listen(env.PORT);

server.on('listening', () => {
  logger.info(
    `Cartiva Mini Backend Server running in [${env.NODE_ENV}] mode on http://localhost:${env.PORT}`
  );
  logger.info(`Liveness check:  http://localhost:${env.PORT}/api/v1/health`);
  logger.info(`Readiness check: http://localhost:${env.PORT}/api/v1/health/ready`);
  logger.info(`API Docs:        http://localhost:${env.PORT}/api/v1/docs`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.fatal(
      `Port ${env.PORT} is already in use by another process. Please terminate the conflicting process or release the port.`
    );
  } else {
    logger.fatal(
      { err: env.NODE_ENV === 'production' ? error.message : error },
      `HTTP server error: ${error.message}`
    );
  }
  process.exit(1);
});

// Initialize database connection
void connectDatabase().catch((error) => {
  logger.warn(
    { err: env.NODE_ENV === 'production' ? (error as Error).message : error },
    'Initial MongoDB connection failed. Server will continue operating in degraded mode.'
  );
});

let isShuttingDown = false;

// Graceful Shutdown Management
const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown of HTTP server...`);

  // Close idle keep-alive connections
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, 'Error during HTTP server close');
      process.exit(1);
    }
    logger.info('HTTP server closed. Releasing system resources...');

    try {
      // Disconnect database connection if active
      await disconnectDatabase();
      logger.info('Graceful shutdown completed successfully. Process exiting.');
      process.exit(0);
    } catch (cleanupError) {
      logger.error({ err: cleanupError }, 'Error during resource cleanup');
      process.exit(1);
    }
  });

  // Force close after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Forceful shutdown triggered after 10-second timeout');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// Process-level error handling
process.on('uncaughtException', (error: Error) => {
  logger.fatal({ err: error }, `UNCAUGHT EXCEPTION: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal({ reason }, `UNHANDLED PROMISE REJECTION: ${String(reason)}`);
  process.exit(1);
});

export { app, server };
