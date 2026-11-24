import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import { HttpStatus } from '../constants/httpStatusCodes.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import type { ApiErrorResponse, ApiFieldError } from '@shared/api.types.js';

interface MongooseErrorLike extends Error {
  name: string;
  code?: number;
  path?: string;
  value?: unknown;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, { path: string; message: string }>;
}

/**
 * Centralized Application Error Handling Middleware.
 * Catches operational and programming errors, formats consistent error envelopes,
 * and securely logs error diagnostics without leaking secrets or production stack traces.
 */
export const errorHandler = (
  err: Error | AppError | MongooseErrorLike,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
  let errorCode: string = ErrorCodes.INTERNAL_SERVER_ERROR;
  let message = 'An unexpected server error occurred. Our technical team has been notified.';
  let details: ApiFieldError[] | undefined = undefined;

  // 1. AppError (Explicitly thrown operational errors)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorCode = err.code;
    message = err.message;
    details = err.details;
  }
  // 1b. Zod Schema Validation Error
  else if (err instanceof ZodError) {
    statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation failed for incoming request data. Please check the submitted fields.';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // 2. JSON Parser Syntax Error (Malformed request payload)
  else if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCodes.MALFORMED_JSON;
    message = 'The submitted request body contains malformed JSON syntax.';
  }
  // 3. Payload Too Large Error
  else if ('type' in err && (err as { type: string }).type === 'entity.too.large') {
    statusCode = 413;
    errorCode = ErrorCodes.PAYLOAD_TOO_LARGE;
    message = 'The submitted request payload exceeds the allowed 1MB size limit.';
  }
  // 4. Mongoose Cast Error (Invalid MongoDB ObjectId format - Phase 4 prep)
  else if (err.name === 'CastError') {
    const castErr = err as MongooseErrorLike;
    statusCode = HttpStatus.BAD_REQUEST;
    errorCode = ErrorCodes.BAD_REQUEST;
    message = `Invalid format provided for field '${castErr.path || 'identifier'}'.`;
  }
  // 5. Mongoose Duplicate Key Error (Code 11000 - Phase 4 prep)
  else if (err.name === 'MongoServerError' && (err as MongooseErrorLike).code === 11000) {
    const dupErr = err as MongooseErrorLike;
    statusCode = HttpStatus.CONFLICT;
    errorCode = ErrorCodes.CONFLICT;
    const duplicatedField = dupErr.keyValue ? Object.keys(dupErr.keyValue)[0] : 'record';
    message = `A resource with that ${duplicatedField} already exists.`;
  }
  // 6. Mongoose Validation Error (Phase 4 prep)
  else if (err.name === 'ValidationError' && (err as MongooseErrorLike).errors) {
    statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
    errorCode = ErrorCodes.VALIDATION_ERROR;
    message = 'Database validation failed for the submitted record.';
    const mongooseErrors = (err as MongooseErrorLike).errors || {};
    details = Object.keys(mongooseErrors).map((key) => {
      const fieldError = mongooseErrors[key];
      return {
        field: fieldError ? fieldError.path : key,
        message: fieldError ? fieldError.message : 'Invalid field value',
      };
    });
  }

  // Secure diagnostic logging (Sanitizes passwords, tokens, auth headers)
  const logContext = {
    errorCode,
    message: err.message,
    statusCode,
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
  };

  if (statusCode >= 500) {
    logger.error({ ...logContext, err }, `Server Error: ${err.message}`);
  } else {
    logger.warn(logContext, `Client Error [${statusCode}]: ${message}`);
  }

  // Construct standard ApiErrorResponse envelope
  const responsePayload: ApiErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  // Attach stack trace exclusively in local development mode for 500-level errors
  if (env.NODE_ENV === 'development' && statusCode >= 500 && err.stack) {
    responsePayload.error.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};
