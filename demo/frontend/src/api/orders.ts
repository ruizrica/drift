/**
 * Order API
 * 
 * ✓ PATTERN: Typed API functions
 */

import { apiClient } from './client';
import type { ApiResponse, Order, OrderItem } from '../types/api';

export async function getOrders(
  page = 1,
  limit = 10,
  status?: string
): Promise<ApiResponse<Order[]>> {
  return apiClient.get<ApiResponse<Order[]>>('/api/orders');
}

export async function getOrder(id: string): Promise<ApiResponse<Order>> {
  return apiClient.get<ApiResponse<Order>>('/api/orders/' + id);
}

export async function createOrder(data: {
  items: OrderItem[];
  shippingAddress: string;
}): Promise<ApiResponse<Order>> {
  return apiClient.post<ApiResponse<Order>>('/api/orders', data);
}

export async function cancelOrder(id: string): Promise<ApiResponse<Order>> {
  return apiClient.put<ApiResponse<Order>>('/api/orders/' + id + '/cancel', {});
}
