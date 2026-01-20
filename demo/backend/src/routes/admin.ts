/**
 * Admin Routes
 * 
 * ✓ MOSTLY FOLLOWS PATTERNS but has some violations:
 * - Uses authMiddleware + adminMiddleware for most routes
 * - Uses sendSuccess for responses
 * 
 * ⚠️ VIOLATIONS:
 * - /stats endpoint missing auth middleware!
 * - /export uses non-standard response format
 */

import { Router, Request, Response } from 'express';
import { authMiddleware, adminMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { sendSuccess } from '../utils/response';
import { adminService } from '../services/adminService';

const router = Router();

// GET /api/admin/dashboard - Admin dashboard data
router.get('/dashboard', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const dashboardData = await adminService.getDashboardData();
  sendSuccess(res, dashboardData);
});

// GET /api/admin/users - List all users with admin details
router.get('/users', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const users = await adminService.getAllUsers();
  sendSuccess(res, users);
});

// ⚠️ VIOLATION: Missing authMiddleware and adminMiddleware!
// This is a security issue - anyone can access admin stats
router.get('/stats', async (req: Request, res: Response) => {
  const stats = await adminService.getStats();
  sendSuccess(res, stats);
});

// ⚠️ VIOLATION: Non-standard response format
// Should use sendSuccess() but directly sends data
router.get('/export', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const data = await adminService.exportData();
  // Wrong! Should be: sendSuccess(res, data);
  res.json(data); // Missing success wrapper!
});

// ⚠️ VIOLATION: Using res.send instead of res.json
router.get('/health', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const health = await adminService.getSystemHealth();
  // Wrong! Should be: sendSuccess(res, health);
  res.send(health); // Inconsistent response method!
});

// POST /api/admin/users/:id/ban - Ban a user
router.post('/users/:id/ban', authMiddleware, adminMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await adminService.banUser(req.params.id);
  sendSuccess(res, result);
});

export default router;
