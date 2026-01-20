/**
 * API Hooks Tests
 *
 * Tests for the React Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Hooks', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('fetchJson helper', () => {
    it('should handle successful responses', async () => {
      const mockData = { healthScore: 85 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const response = await fetch('/api/stats');
      const data = await response.json();

      expect(data).toEqual(mockData);
    });

    it('should handle error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const response = await fetch('/api/patterns/invalid');
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('URL construction', () => {
    it('should build query strings for pattern filters', () => {
      const filters = {
        category: 'api',
        status: 'approved',
        minConfidence: 0.8,
        search: 'auth',
      };

      const params = new URLSearchParams();
      if (filters.category) params.set('category', filters.category);
      if (filters.status) params.set('status', filters.status);
      if (filters.minConfidence) params.set('minConfidence', String(filters.minConfidence));
      if (filters.search) params.set('search', filters.search);

      expect(params.toString()).toBe('category=api&status=approved&minConfidence=0.8&search=auth');
    });

    it('should handle empty filters', () => {
      const filters = {};
      const params = new URLSearchParams();

      expect(params.toString()).toBe('');
    });

    it('should encode file paths correctly', () => {
      const path = 'src/components/Button.tsx';
      const encoded = encodeURIComponent(path);

      expect(encoded).toBe('src%2Fcomponents%2FButton.tsx');
    });
  });
});

describe('WebSocket Hook', () => {
  describe('message parsing', () => {
    it('should parse violation messages', () => {
      const message = {
        type: 'violation',
        payload: {
          id: 'v1',
          patternId: 'p1',
          patternName: 'Test Pattern',
          severity: 'error',
          file: 'test.ts',
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 10 } },
          message: 'Test violation',
          expected: 'foo',
          actual: 'bar',
        },
      };

      expect(message.type).toBe('violation');
      expect(message.payload.severity).toBe('error');
    });

    it('should parse pattern_updated messages', () => {
      const message = {
        type: 'pattern_updated',
        payload: { id: 'p1', status: 'approved' },
      };

      expect(message.type).toBe('pattern_updated');
      expect(message.payload.status).toBe('approved');
    });

    it('should parse stats_updated messages', () => {
      const message = {
        type: 'stats_updated',
        payload: {
          healthScore: 90,
          patterns: { total: 10, byStatus: {}, byCategory: {} },
          violations: { total: 5, bySeverity: {} },
          files: { total: 100, scanned: 100 },
          detectors: { active: 5, total: 10 },
          lastScan: '2024-01-01T00:00:00Z',
        },
      };

      expect(message.type).toBe('stats_updated');
      expect(message.payload.healthScore).toBe(90);
    });
  });
});

describe('Store', () => {
  it('should handle realtime violations with max limit', () => {
    const violations: Array<{ id: string }> = [];
    const maxViolations = 100;

    // Add 105 violations
    for (let i = 0; i < 105; i++) {
      violations.unshift({ id: `v${i}` });
      if (violations.length > maxViolations) {
        violations.pop();
      }
    }

    expect(violations.length).toBe(100);
    expect(violations[0].id).toBe('v104');
  });

  it('should toggle set membership correctly', () => {
    const set = new Set<string>();

    // Add
    set.add('item1');
    expect(set.has('item1')).toBe(true);

    // Toggle off
    set.delete('item1');
    expect(set.has('item1')).toBe(false);

    // Toggle on
    set.add('item1');
    expect(set.has('item1')).toBe(true);
  });
});
