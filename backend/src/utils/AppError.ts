import type { ApiFieldError } from '@shared/api.types.js';
import { HttpStatus, type HttpStatusCode } from '../constants/httpStatusCodes.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Operational Application Error.
 * Differentiates anticipated client/system errors from unexpected programming bugs.
 */
export class AppError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly isOperational: boolean;
  public readonly code: string;
  public readonly details?: ApiFieldError[];

  constructor(
    message: string,
    statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
    details?: ApiFieldError[]
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(
    message: string,
    code: string = ErrorCodes.BAD_REQUEST,
    details?: ApiFieldError[]
  ): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, code, details);
  }

  static unauthorized(
    message = 'Authentication credentials are required to access this resource.',
    code: string = ErrorCodes.UNAUTHORIZED
  ): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED, code);
  }

  static forbidden(
    message = 'You do not have permission to access this resource.',
    code: string = ErrorCodes.FORBIDDEN
  ): AppError {
    return new AppError(message, HttpStatus.FORBIDDEN, code);
  }

  static notFound(
    message = 'The requested resource could not be found.',
    code: string = ErrorCodes.RESOURCE_NOT_FOUND
  ): AppError {
    return new AppError(message, HttpStatus.NOT_FOUND, code);
  }

  static conflict(message: string, code: string = ErrorCodes.CONFLICT): AppError {
    return new AppError(message, HttpStatus.CONFLICT, code);
  }

  static unprocessable(
    message = 'Validation failed for the submitted data.',
    code: string = ErrorCodes.VALIDATION_ERROR,
    details?: ApiFieldError[]
  ): AppError {
    return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, code, details);
  }

  static tooManyRequests(
    message = 'Too many requests. Please slow down and try again later.',
    code: string = ErrorCodes.TOO_MANY_REQUESTS
  ): AppError {
    return new AppError(message, HttpStatus.TOO_MANY_REQUESTS, code);
  }

  static notImplemented(
    message = 'This capability is not yet implemented on this server.',
    code: string = ErrorCodes.NOT_IMPLEMENTED
  ): AppError {
    return new AppError(message, HttpStatus.NOT_IMPLEMENTED, code);
  }

  static serviceUnavailable(
    message = 'The service is temporarily unavailable. Please try again shortly.',
    code: string = ErrorCodes.SERVICE_UNAVAILABLE
  ): AppError {
    return new AppError(message, HttpStatus.SERVICE_UNAVAILABLE, code);
  }

  static internal(
    message = 'An unexpected internal server error occurred.',
    code: string = ErrorCodes.INTERNAL_SERVER_ERROR
  ): AppError {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, code);
  }
}
