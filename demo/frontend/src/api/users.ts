/**
 * User API
 * 
 * ✓ PATTERN: Typed API functions with consistent error handling
 */

import { apiClient } from './client';
import type { ApiResponse, User } from '../types/api';

export async function getUsers(page = 1, limit = 10): Promise<ApiResponse<User[]>> {
  return apiClient.get<ApiResponse<User[]>>('/api/users');
}

export async function getUser(id: string): Promise<ApiResponse<User>> {
  return apiClient.get<ApiResponse<User>>('/api/users/' + id);
}

export async function createUser(data: { email: string; name: string; password: string }): Promise<ApiResponse<User>> {
  return apiClient.post<ApiResponse<User>>('/api/users', data);
}

export async function updateUser(id: string, data: Partial<User>): Promise<ApiResponse<User>> {
  return apiClient.put<ApiResponse<User>>('/api/users/' + id, data);
}

export async function deleteUser(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiClient.delete<ApiResponse<{ deleted: boolean }>>('/api/users/' + id);
}
