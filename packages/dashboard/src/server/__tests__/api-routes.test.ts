/**
 * API Routes Unit Tests
 *
 * Tests for the Express API endpoints.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import express from 'express';
import request from 'supertest';
import { DriftDataReader } from '../drift-data-reader.js';
import { createApiRoutes, errorHandler, notFoundHandler } from '../api-routes.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestPatternFile = (category: string, patterns: unknown[]) => ({
  version: '1.0.0',
  category,
  patterns,
  lastUpdated: new Date().toISOString(),
  checksum: 'test-checksum',
});

const createTestPattern = (overrides: Partial<{
  id: string;
  name: string;
  subcategory: string;
  description: string;
  severity: string;
  locations: unknown[];
  outliers: unknown[];
}> = {}) => ({
  id: overrides.id ?? 'test-pattern-1',
  subcategory: overrides.subcategory ?? 'test-subcategory',
  name: overrides.name ?? 'Test Pattern',
  description: overrides.description ?? 'A test pattern description',
  detector: {
    type: 'regex',
    config: { patternId: 'test/pattern' },
  },
  confidence: {
    frequency: 0.8,
    consistency: 0.9,
    age: 0,
    spread: 10,
    score: 0.85,
    level: 'high',
  },
  locations: overrides.locations ?? [
    { file: 'src/test.ts', line: 10, column: 1 },
    { file: 'src/test2.ts', line: 20, column: 5 },
  ],
  outliers: overrides.outliers ?? [],
  metadata: {
    firstSeen: '2024-01-01T00:00:00.000Z',
    lastSeen: '2024-01-15T00:00:00.000Z',
    source: 'auto-detected',
    tags: ['test'],
  },
  severity: overrides.severity ?? 'warning',
  autoFixable: false,
});

const createTestOutlier = (overrides: Partial<{
  file: string;
  line: number;
  column: number;
  reason: string;
  deviationScore: number;
}> = {}) => ({
  file: overrides.file ?? 'src/outlier.ts',
  line: overrides.line ?? 15,
  column: overrides.column ?? 1,
  reason: overrides.reason ?? 'Deviates from expected pattern',
  deviationScore: overrides.deviationScore ?? 0.5,
});

// ============================================================================
// Test Setup
// ============================================================================

describe('API Routes', () => {
  let tempDir: string;
  let driftDir: string;
  let reader: DriftDataReader;
  let app: express.Express;

  beforeEach(async () => {
    // Create a temporary directory for test data
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'drift-api-test-'));
    driftDir = path.join(tempDir, '.drift');
    
    // Create the .drift directory structure
    await fs.mkdir(path.join(driftDir, 'patterns', 'discovered'), { recursive: true });
    await fs.mkdir(path.join(driftDir, 'patterns', 'approved'), { recursive: true });
    await fs.mkdir(path.join(driftDir, 'patterns', 'ignored'), { recursive: true });
    
    reader = new DriftDataReader(driftDir);
    
    // Create Express app with API routes
    app = express();
    app.use(express.json());
    app.use('/api', createApiRoutes(reader));
    app.use('/api/*', notFoundHandler);
    app.use(errorHandler);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  // ==========================================================================
  // Pattern Routes Tests
  // ==========================================================================

  describe('GET /api/patterns', () => {
    it('should return empty array when no patterns exist', async () => {
      const response = await request(app).get('/api/patterns');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return all patterns', async () => {
      const testPattern = createTestPattern({ id: 'pattern-1' });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).get('/api/patterns');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('pattern-1');
    });

    it('should filter patterns by category', async () => {
      const apiPattern = createTestPattern({ id: 'api-1' });
      const loggingPattern = createTestPattern({ id: 'logging-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [apiPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'logging.json'),
        JSON.stringify(createTestPatternFile('logging', [loggingPattern]))
      );

      const response = await request(app).get('/api/patterns?category=api');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('api-1');
    });

    it('should filter patterns by status', async () => {
      const discoveredPattern = createTestPattern({ id: 'discovered-1' });
      const approvedPattern = createTestPattern({ id: 'approved-1' });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [discoveredPattern]))
      );
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'approved', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [approvedPattern]))
      );

      const response = await request(app).get('/api/patterns?status=approved');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe('approved-1');
    });
  });

  describe('GET /api/patterns/:id', () => {
    it('should return 404 for non-existent pattern', async () => {
      const response = await request(app).get('/api/patterns/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('NotFoundError');
    });

    it('should return pattern with locations', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-with-locations',
        locations: [
          { file: 'src/a.ts', line: 10, column: 5 },
          { file: 'src/b.ts', line: 20, column: 10 },
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).get('/api/patterns/pattern-with-locations');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('pattern-with-locations');
      expect(response.body.locations).toHaveLength(2);
    });
  });

  describe('POST /api/patterns/:id/approve', () => {
    it('should return 404 for non-existent pattern', async () => {
      const response = await request(app).post('/api/patterns/non-existent/approve');
      
      expect(response.status).toBe(404);
    });

    it('should approve a pattern', async () => {
      const testPattern = createTestPattern({ id: 'to-approve' });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).post('/api/patterns/to-approve/approve');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify pattern is now approved
      const getResponse = await request(app).get('/api/patterns/to-approve');
      expect(getResponse.body.status).toBe('approved');
    });
  });

  describe('POST /api/patterns/:id/ignore', () => {
    it('should return 404 for non-existent pattern', async () => {
      const response = await request(app).post('/api/patterns/non-existent/ignore');
      
      expect(response.status).toBe(404);
    });

    it('should ignore a pattern', async () => {
      const testPattern = createTestPattern({ id: 'to-ignore' });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).post('/api/patterns/to-ignore/ignore');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify pattern is now ignored
      const getResponse = await request(app).get('/api/patterns/to-ignore');
      expect(getResponse.body.status).toBe('ignored');
    });
  });

  describe('DELETE /api/patterns/:id', () => {
    it('should return 404 for non-existent pattern', async () => {
      const response = await request(app).delete('/api/patterns/non-existent');
      
      expect(response.status).toBe(404);
    });

    it('should delete a pattern', async () => {
      const testPattern = createTestPattern({ id: 'to-delete' });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).delete('/api/patterns/to-delete');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify pattern is deleted
      const getResponse = await request(app).get('/api/patterns/to-delete');
      expect(getResponse.status).toBe(404);
    });
  });

  // ==========================================================================
  // Violation Routes Tests
  // ==========================================================================

  describe('GET /api/violations', () => {
    it('should return empty array when no violations exist', async () => {
      const response = await request(app).get('/api/violations');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return violations from pattern outliers', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-1',
        outliers: [
          createTestOutlier({ file: 'src/violation.ts', line: 25 }),
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).get('/api/violations');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].file).toBe('src/violation.ts');
    });

    it('should filter violations by severity', async () => {
      const errorPattern = createTestPattern({
        id: 'error-pattern',
        severity: 'error',
        outliers: [createTestOutlier({ file: 'a.ts', line: 10 })],
      });
      const warningPattern = createTestPattern({
        id: 'warning-pattern',
        severity: 'warning',
        outliers: [createTestOutlier({ file: 'b.ts', line: 20 })],
      });
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(createTestPatternFile('api', [errorPattern, warningPattern]))
      );

      const response = await request(app).get('/api/violations?severity=error');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].severity).toBe('error');
    });
  });

  // ==========================================================================
  // File Routes Tests
  // ==========================================================================

  describe('GET /api/files', () => {
    it('should return empty array when no patterns exist', async () => {
      const response = await request(app).get('/api/files');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should return file tree', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/utils/helper.ts', line: 10, column: 1 },
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).get('/api/files');
      
      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/files/*', () => {
    it('should return 404 for file with no patterns', async () => {
      const response = await request(app).get('/api/files/non-existent.ts');
      
      expect(response.status).toBe(404);
    });

    it('should return file details', async () => {
      const testPattern = createTestPattern({
        id: 'pattern-1',
        locations: [
          { file: 'src/test.ts', line: 10, column: 1 },
        ],
      });
      const patternFile = createTestPatternFile('api', [testPattern]);
      
      await fs.writeFile(
        path.join(driftDir, 'patterns', 'discovered', 'api.json'),
        JSON.stringify(patternFile)
      );

      const response = await request(app).get('/api/files/src/test.ts');
      
      expect(response.status).toBe(200);
      expect(response.body.path).toBe('src/test.ts');
      expect(response.body.patterns).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Stats Routes Tests
  // ==========================================================================

  describe('GET /api/stats', () => {
    it('should return stats', async () => {
      const response = await request(app).get('/api/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('healthScore');
      expect(response.body).toHaveProperty('patterns');
      expect(response.body).toHaveProperty('violations');
    });
  });

  // ==========================================================================
  // Config Routes Tests
  // ==========================================================================

  describe('GET /api/config', () => {
    it('should return default config when none exists', async () => {
      const response = await request(app).get('/api/config');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('detectors');
    });
  });

  describe('PUT /api/config', () => {
    it('should update config', async () => {
      const response = await request(app)
        .put('/api/config')
        .send({ ignorePatterns: ['test/**'] });
      
      expect(response.status).toBe(200);
      expect(response.body.ignorePatterns).toContain('test/**');
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });

    it('should return JSON error responses', async () => {
      const response = await request(app).get('/api/patterns/non-existent');
      
      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('statusCode');
    });
  });
});
