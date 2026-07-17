import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined;
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) throw new ApiError(401, 'Authentication required');

  try {
    req.user = verifyToken(token);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
  next();
}
