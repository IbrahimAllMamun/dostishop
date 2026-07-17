import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';

export function notFound(req: Request, _res: Response, next: NextFunction): void {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Multer upload errors (e.g. file too large)
  if (err && typeof err === 'object' && (err as { name?: string }).name === 'MulterError') {
    const m = err as { code?: string; message: string };
    res.status(400).json({
      error: m.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : m.message,
    });
    return;
  }

  // Prisma unique-constraint & not-found errors surface as 500 unless mapped; keep it simple for now.
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    ...(env.NODE_ENV !== 'production' ? { message: (err as Error).message } : {}),
  });
}
