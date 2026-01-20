/**
 * Error Handler Middleware
 * 
 * ✓ PATTERN: Centralized error handling with consistent response format
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, error.message);

  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      },
    });
    return;
  }

  // Unknown errors
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  });
}
