import mongoose, { type ConnectOptions } from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

export interface DatabaseState {
  status: 'connected' | 'disconnected' | 'connecting';
  ready: boolean;
  message: string;
}

/**
 * Returns current MongoDB connection status.
 * Accurately reports connection state without masking disconnections.
 */
export const getDatabaseStatus = (): DatabaseState => {
  const readyState = mongoose.connection.readyState;

  switch (readyState) {
    case 1:
      return {
        status: 'connected',
        ready: true,
        message: 'MongoDB connection active.',
      };
    case 2:
      return {
        status: 'connecting',
        ready: false,
        message: 'MongoDB connection is currently initializing.',
      };
    case 3:
      return {
        status: 'disconnected',
        ready: false,
        message: 'MongoDB connection is currently disconnecting.',
      };
    case 0:
    default:
      return {
        status: 'disconnected',
        ready: false,
        message: 'MongoDB is disconnected.',
      };
  }
};

/**
 * Safe URI sanitizer that hides credentials from logs.
 */
const sanitizeMongoUri = (uri: string): string => {
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

/**
 * Establishes MongoDB connection using Mongoose with resilient connection pooling.
 */
export const connectDatabase = async (uri: string = env.MONGODB_URI): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState !== 0 && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
  }

  const currentState = mongoose.connection.readyState;
  if (currentState === 1) {
    return mongoose;
  }

  const options: ConnectOptions = {
    autoIndex: env.NODE_ENV !== 'production', // Build indexes in dev/test; manual in high-traffic prod
    maxPoolSize: 50,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  const safeUri = sanitizeMongoUri(uri);

  try {
    logger.info(`Connecting to MongoDB at [${safeUri}]...`);
    const conn = await mongoose.connect(uri, options);
    logger.info('MongoDB connected successfully.');
    return conn;
  } catch (error) {
    logger.error({ err: error }, `Failed to connect to MongoDB at [${safeUri}]`);
    throw error;
  }
};

/**
 * Graceful database disconnection handler for server shutdown and testing.
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    try {
      logger.info('Closing MongoDB connection...');
      await mongoose.disconnect();
      logger.info('MongoDB disconnected successfully.');
    } catch (error) {
      logger.error({ err: error }, 'Error during MongoDB disconnection.');
    }
  }
};

// Global Mongoose Event Listeners for Lifecycle Monitoring
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connection event: CONNECTED');
});

mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'Mongoose connection event: ERROR');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose connection event: DISCONNECTED');
});

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose connection event: RECONNECTED');
});
