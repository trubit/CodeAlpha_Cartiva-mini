import helmet from 'helmet';
import cors from 'cors';
import type { RequestHandler } from 'express';
import { helmetOptions } from '../config/security.js';
import { corsOptions } from '../config/cors.js';

/**
 * Helmet Security Headers Middleware.
 */
export const helmetSecurity: RequestHandler = helmet(helmetOptions);

/**
 * CORS Middleware enforcing explicit frontend allowlists.
 */
export const corsSecurity: RequestHandler = cors(corsOptions);
