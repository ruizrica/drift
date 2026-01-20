/**
 * Product Routes
 * 
 * ✓ FOLLOWS ALL PATTERNS:
 * - Uses authMiddleware for protected routes
 * - Uses sendSuccess/sendPaginated for responses
 * - Uses ApiError for error handling
 */

import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess, sendPaginated, sendCreated } from '../utils/response';
import { NotFoundError, ValidationError } from '../utils/errors';
import { productService } from '../services/productService';

const router = Router();

// GET /api/products - List all products (public)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const category = req.query.category as string;

  const { products, total } = await productService.findAll({ page, limit, category });
  sendPaginated(res, products, page, limit, total);
});

// GET /api/products/:id - Get product by ID (public)
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  const product = await productService.findById(req.params.id);
  
  if (!product) {
    throw new NotFoundError('Product');
  }

  sendSuccess(res, product);
});

// POST /api/products - Create product (protected)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { name, price, description, category } = req.body;

  if (!name || price === undefined) {
    throw new ValidationError('Name and price are required');
  }

  const product = await productService.create({ name, price, description, category });
  sendCreated(res, product);
});

// PUT /api/products/:id - Update product (protected)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const product = await productService.update(req.params.id, req.body);
  
  if (!product) {
    throw new NotFoundError('Product');
  }

  sendSuccess(res, product);
});

// DELETE /api/products/:id - Delete product (protected)
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const deleted = await productService.delete(req.params.id);
  
  if (!deleted) {
    throw new NotFoundError('Product');
  }

  sendSuccess(res, { deleted: true });
});

export default router;
