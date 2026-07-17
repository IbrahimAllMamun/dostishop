import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/** Restrict a route to one or more roles. Must run after `authenticate`. */
export const authorize =
  (...roles: Array<'SUPER_ADMIN' | 'VENDOR'>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new ApiError(401, 'Authentication required');
    if (roles.length && !roles.includes(req.user.role)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    next();
  };
