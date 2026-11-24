import type { Response } from 'express';
import type { ApiResponse, PaginationMeta } from '@shared/api.types.js';
import { HttpStatus } from '../constants/httpStatusCodes.js';

/**
 * Standardized API response sender.
 * Enforces the approved ApiResponse<T> contract across all controllers.
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Operation completed successfully.',
  statusCode: number = HttpStatus.OK,
  meta?: PaginationMeta
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };

  return res.status(statusCode).json(payload);
};

export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully.'
): Response => {
  return sendSuccess(res, data, message, HttpStatus.CREATED);
};

export const sendNoContent = (res: Response): Response => {
  return res.status(HttpStatus.NO_CONTENT).send();
};

export const sendSuccessResponse = sendSuccess;
export const sendCreatedResponse = sendCreated;
