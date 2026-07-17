import { RequestHandler } from 'express';

/** Wraps an async route handler so thrown/rejected errors reach the error middleware. */
export const asyncHandler =
  (fn: RequestHandler): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
