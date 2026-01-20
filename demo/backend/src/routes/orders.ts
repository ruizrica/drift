/**
 * Order Routes
 * 
 * ✓ FOLLOWS ALL PATTERNS:
 * - Uses authMiddleware for all routes (orders are user-specific)
 * - Uses sendSuccess/sendPaginated for responses
 * - Uses ApiError for error handling
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendPaginated, sendCreated } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { orderService } from '../services/orderService';

const router = Router();

// All order routes require authentication
router.use(authMiddleware);

// GET /api/orders - List user's orders
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  const { orders, total } = await orderService.findByUser(req.user!.id, { page, limit, status });
  sendPaginated(res, orders, page, limit, total);
});

// GET /api/orders/:id - Get order by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const order = await orderService.findById(req.params.id, req.user!.id);
  
  if (!order) {
    throw new NotFoundError('Order');
  }

  sendSuccess(res, order);
});

// POST /api/orders - Create new order
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  const { items, shippingAddress } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ValidationError('Order must contain at least one item');
  }

  if (!shippingAddress) {
    throw new ValidationError('Shipping address is required');
  }

  const order = await orderService.create({
    userId: req.user!.id,
    items,
    shippingAddress,
  });

  sendCreated(res, order);
});

// PUT /api/orders/:id/cancel - Cancel order
router.put('/:id/cancel', async (req: AuthenticatedRequest, res: Response) => {
  const order = await orderService.cancel(req.params.id, req.user!.id);
  
  if (!order) {
    throw new NotFoundError('Order');
  }

  sendSuccess(res, order);
});

export default router;
