import express from 'express';
import fs from 'node:fs';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { corsOrigins, env, uploadsDir } from './config/env';
import { router } from './routes';
import { notFound, errorHandler } from './middleware/error';

export function createApp() {
  const app = express();

  // Allow images to be embedded cross-origin (storefront/dashboard on other ports)
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // Serve locally-stored uploads (no-op destination when using Cloudinary)
  fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Throttle auth endpoints against brute force
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/v1/auth', authLimiter);

  app.use('/api/v1', router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
