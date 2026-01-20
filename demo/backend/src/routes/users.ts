/**
 * User Routes
 * 
 * ✓ FOLLOWS ALL PATTERNS:
 * - Uses authMiddleware for protected routes
 * - Uses sendSuccess/sendPaginated for responses
 * - Uses ApiError for error handling
 * - Consistent async/await with try-catch
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendPaginated, sendCreated } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { userService } from '../services/userService';

const router = Router();

// GET /api/users - List all users (paginated)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const { users, total } = await userService.findAll(page, limit);
  sendPaginated(res, users, page, limit, total);
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User');
  }

  sendSuccess(res, user);
});

// POST /api/users - Create new user
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { email, name, password } = req.body;

  if (!email || !name || !password) {
    throw new ValidationError('Email, name, and password are required');
  }

  const user = await userService.create({ email, name, password });
  sendCreated(res, user);
});

// PUT /api/users/:id - Update user
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const user = await userService.update(req.params.id, req.body);
  
  if (!user) {
    throw new NotFoundError('User');
  }

  sendSuccess(res, user);
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const deleted = await userService.delete(req.params.id);
  
  if (!deleted) {
    throw new NotFoundError('User');
  }

  sendSuccess(res, { deleted: true });
});

export default router;
