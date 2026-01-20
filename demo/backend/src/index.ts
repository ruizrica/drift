/**
 * Demo Backend Server
 * 
 * Express.js API demonstrating consistent patterns
 * that Drift can detect and monitor.
 */

import express from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';

// Route imports
import userRoutes from './routes/users';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import adminRoutes from './routes/admin';
import legacyRoutes from './routes/legacy'; // Contains pattern violations!

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/legacy', legacyRoutes); // Inconsistent patterns here!

// Error handling (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Demo server running on http://localhost:${PORT}`);
});

export default app;
