/**
 * Legacy Routes
 * 
 * ⚠️ THIS FILE CONTAINS MANY PATTERN VIOLATIONS!
 * 
 * These routes were written before the team established patterns.
 * Drift will detect all these inconsistencies.
 */

import { Router, Request, Response } from 'express';

const router = Router();

// ⚠️ VIOLATION: No auth middleware on protected endpoint
// ⚠️ VIOLATION: Using callback style instead of async/await
// ⚠️ VIOLATION: Non-standard response format
router.get('/users', (req: Request, res: Response) => {
  // Simulated database call
  const users = [
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ];
  
  // Wrong! Should use sendSuccess(res, users)
  res.send(users);
});

// ⚠️ VIOLATION: No auth middleware
// ⚠️ VIOLATION: Inconsistent error handling (no ApiError)
// ⚠️ VIOLATION: Magic status codes instead of constants
router.get('/users/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  if (isNaN(id)) {
    // Wrong! Should throw ValidationError
    res.status(400).send({ error: 'Invalid ID' });
    return;
  }
  
  const user = { id, name: 'Legacy User', email: 'legacy@example.com' };
  
  if (!user) {
    // Wrong! Should throw NotFoundError
    res.status(404).send({ error: 'User not found' });
    return;
  }
  
  // Wrong! Should use sendSuccess
  res.json(user);
});

// ⚠️ VIOLATION: No auth middleware on write operation
// ⚠️ VIOLATION: No input validation
// ⚠️ VIOLATION: Inconsistent response format
router.post('/users', (req: Request, res: Response) => {
  const { name, email } = req.body;
  
  // No validation! Should check required fields
  
  const newUser = {
    id: Date.now(),
    name,
    email,
    created: new Date(), // Extra field not in standard response
  };
  
  // Wrong! Should use sendCreated
  res.status(201).json({ user: newUser }); // Wrong wrapper!
});

// ⚠️ VIOLATION: Mixing concerns - business logic in route handler
// ⚠️ VIOLATION: No error handling
// ⚠️ VIOLATION: Console.log instead of proper logging
router.delete('/users/:id', (req: Request, res: Response) => {
  console.log('Deleting user:', req.params.id); // Should use logger
  
  // Business logic should be in service
  const deleted = true;
  
  // Wrong! Should use sendSuccess or sendNoContent
  res.json({ ok: true, deleted: req.params.id });
});

// ⚠️ VIOLATION: Completely different response structure
router.get('/products', (req: Request, res: Response) => {
  const products = [
    { sku: 'ABC123', title: 'Product 1', cost: 9.99 },
    { sku: 'DEF456', title: 'Product 2', cost: 19.99 },
  ];
  
  // Wrong! Completely different structure than other endpoints
  res.json({
    status: 'success', // Should be 'success: true'
    items: products,   // Should be 'data'
    count: products.length,
  });
});

// ⚠️ VIOLATION: Try-catch without proper error handling
router.post('/orders', async (req: Request, res: Response) => {
  try {
    const order = {
      id: Date.now(),
      ...req.body,
    };
    
    // Wrong! Should use sendCreated
    res.json({ created: true, order });
  } catch (err) {
    // Wrong! Should let errorHandler middleware handle this
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
