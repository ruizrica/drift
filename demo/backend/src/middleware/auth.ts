/**
 * Authentication Middleware
 * 
 * ✓ PATTERN: All protected routes should use this middleware
 * Drift will detect routes that skip authentication.
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'user' | 'admin';
  };
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new ApiError('Authentication required', 401);
  }

  // In real app, verify JWT here
  try {
    // Simulated token decode
    req.user = {
      id: 'user-123',
      email: 'demo@example.com',
      role: 'user',
    };
    next();
  } catch (error) {
    throw new ApiError('Invalid token', 401);
  }
}

export function adminMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'admin') {
    throw new ApiError('Admin access required', 403);
  }
  next();
}
