import type { HelmetOptions } from 'helmet';
import { env } from './env.js';

/**
 * Cartiva Mini — Security HTTP Headers Configuration (Helmet)
 * Sets up robust Content-Security-Policy, HSTS, frame protections, and MIME sniffing prevention.
 */
export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://js.paystack.co',
        'https://checkout.paystack.com',
      ],
      scriptSrcElem: [
        "'self'",
        "'unsafe-inline'",
        'https://js.paystack.co',
        'https://checkout.paystack.com',
      ],
      frameSrc: [
        "'self'",
        'https://checkout.paystack.com',
        'https://js.paystack.co',
      ],
      childSrc: [
        "'self'",
        'https://checkout.paystack.com',
      ],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: [
        "'self'",
        'data:',
        'https://res.cloudinary.com',
        'https://images.unsplash.com',
        'https://*.unsplash.com',
        'https://assets.paystack.com',
        'https://checkout.paystack.com',
      ],
      connectSrc: [
        "'self'",
        'https://api.paystack.co',
        'https://checkout.paystack.com',
        env.FRONTEND_URL,
        'http://localhost:5180',
        'http://127.0.0.1:5180',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
};
