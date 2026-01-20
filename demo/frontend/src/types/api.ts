/**
 * API Types
 * 
 * ✓ PATTERN: Centralized type definitions for API responses
 * 
 * ⚠️ SOME TYPES DON'T MATCH BACKEND - Drift will detect these!
 */

// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code: string;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  // ⚠️ MISMATCH: Backend returns createdAt and updatedAt, but frontend doesn't expect them!
}

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  // ⚠️ MISMATCH: Backend returns inStock and createdAt, frontend doesn't expect them!
}

// Order types
export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  // ⚠️ MISMATCH: Backend returns createdAt and updatedAt as Date, frontend doesn't define them!
}

// Admin types
export interface DashboardData {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  // ⚠️ MISMATCH: Backend also returns activeUsers and recentOrders!
}

export interface AdminStats {
  usersToday: number;
  ordersToday: number;
  // ⚠️ MISMATCH: Backend also returns revenueToday!
}

// ⚠️ MISMATCH: This type is completely different from backend response
export interface ExportData {
  data: unknown[];
  timestamp: string;
  // Backend returns: { users, orders, products, exportedAt }
}
