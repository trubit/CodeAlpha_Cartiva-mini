import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { type ZodTypeAny, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import type { ApiFieldError } from '@shared/api.types.js';

export interface RequestValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Cartiva Mini — Zod Request Validation Middleware
 * Validates request bodies, query strings, and URL path parameters against Zod schemas.
 * Returns structured validation errors (422 Unprocessable Entity) without leaking internals.
 */
export const validateRequest = (schema: RequestValidationSchema): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as Request['query'];
      }
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ApiFieldError[] = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        next(
          AppError.unprocessable(
            'Validation failed for incoming request data. Please check the submitted fields.',
            ErrorCodes.VALIDATION_ERROR,
            details
          )
        );
      } else {
        next(error);
      }
    }
  };
};
