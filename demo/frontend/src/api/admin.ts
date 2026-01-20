/**
 * Admin API
 * 
 * ✓ PATTERN: Typed API functions
 * 
 * ⚠️ Types don't fully match backend responses - Drift will detect!
 */

import { apiClient } from './client';
import type { ApiResponse, DashboardData, AdminStats, ExportData } from '../types/api';

export async function getDashboard(): Promise<ApiResponse<DashboardData>> {
  return apiClient.get<ApiResponse<DashboardData>>('/api/admin/dashboard');
}

export async function getAdminUsers(): Promise<ApiResponse<unknown[]>> {
  return apiClient.get<ApiResponse<unknown[]>>('/api/admin/users');
}

// ⚠️ This endpoint has no auth on backend - security issue!
export async function getStats(): Promise<ApiResponse<AdminStats>> {
  return apiClient.get<ApiResponse<AdminStats>>('/api/admin/stats');
}

// ⚠️ Type mismatch - ExportData doesn't match backend response
export async function exportData(): Promise<ExportData> {
  // Note: Backend doesn't wrap in ApiResponse for this endpoint (violation!)
  return apiClient.get<ExportData>('/api/admin/export');
}

export async function banUser(userId: string): Promise<ApiResponse<{ userId: string; banned: boolean }>> {
  return apiClient.post<ApiResponse<{ userId: string; banned: boolean }>>('/api/admin/users/' + userId + '/ban');
}
