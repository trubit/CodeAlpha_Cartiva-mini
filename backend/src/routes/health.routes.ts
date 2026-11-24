import { Router } from 'express';
import { healthController } from '../controllers/health.controller.js';

export const healthRouter = Router();

// Liveness probe — checks that the process is running
healthRouter.get('/', healthController.getLiveness);

// Readiness probe — checks that external dependencies (MongoDB) are available
healthRouter.get('/ready', healthController.getReadiness);
