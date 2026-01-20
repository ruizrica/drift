/**
 * Product API
 * 
 * ✓ PATTERN: Typed API functions
 */

import { apiClient } from './client';
import type { ApiResponse, Product } from '../types/api';

export async function getProducts(
  page = 1,
  limit = 20,
  category?: string
): Promise<ApiResponse<Product[]>> {
  return apiClient.get<ApiResponse<Product[]>>('/api/products');
}

export async function getProduct(id: string): Promise<ApiResponse<Product>> {
  return apiClient.get<ApiResponse<Product>>('/api/products/' + id);
}

export async function createProduct(data: Omit<Product, 'id'>): Promise<ApiResponse<Product>> {
  return apiClient.post<ApiResponse<Product>>('/api/products', data);
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<ApiResponse<Product>> {
  return apiClient.put<ApiResponse<Product>>('/api/products/' + id, data);
}

export async function deleteProduct(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiClient.delete<ApiResponse<{ deleted: boolean }>>('/api/products/' + id);
}
