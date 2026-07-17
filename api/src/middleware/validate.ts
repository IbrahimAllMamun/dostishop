import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

/** Validate & coerce req.body against a Zod schema. */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(422, 'Validation failed', result.error.flatten().fieldErrors);
    }
    req.body = result.data;
    next();
  };
