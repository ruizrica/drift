/**
 * DriftDataReader
 *
 * Reads and parses data from the .drift/ folder structure.
 * Provides methods for accessing patterns, violations, files, and configuration.
 *
 * @requirements 1.6 - THE Dashboard_Server SHALL read pattern and violation data from the existing `.drift/` folder structure
 * @requirements 8.1 - THE Dashboard_Server SHALL expose GET `/api/patterns` to list all patterns
 * @requirements 8.2 - THE Dashboard_Server SHALL expose GET `/api/patterns/:id` to get pattern details with locations
 * @requirements 8.6 - THE Dashboard_Server SHALL expose GET `/api/violations` to list all violations
 * @requirements 8.7 - THE Dashboard_Server SHALL expose GET `/api/files` to get the file tree
 * @requirements 8.8 - THE Dashboard_Server SHALL expose GET `/api/files/:path` to get patterns and violations for a specific file
 * @requirements 8.9 - THE Dashboard_Server SHALL expose GET `/api/stats` to get overview statistics
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  PatternFile,
  PatternStatus,
  PatternCategory,
  PatternLocation,
  OutlierLocation,
  StoredPattern,
  Severity,
} from 'driftdetect-core';

// ============================================================================
// Types
// ============================================================================

export interface PatternQuery {
  category?: string;
  status?: string;
  minConfidence?: number;
  search?: string;
}

export interface ViolationQuery {
  severity?: string;
  file?: string;
  patternId?: string;
  search?: string;
}

/**
 * Pattern representation for the dashboard API
 */
export interface DashboardPattern {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  status: PatternStatus;
  description: string;
  confidence: {
    score: number;
    level: string;
  };
  locationCount: number;
  outlierCount: number;
  severity: string;
  metadata: {
    firstSeen: string;
    lastSeen: string;
    tags?: string[] | undefined;
  };
}

/**
 * Pattern with full location details for the dashboard API
 */
export interface DashboardPatternWithLocations extends DashboardPattern {
  locations: SemanticLocation[];
  outliers: OutlierWithDetails[];
}

/**
 * Semantic location for the dashboard
 */
export interface SemanticLocation {
  file: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
}

/**
 * Outlier with reason details
 */
export interface OutlierWithDetails extends SemanticLocation {
  reason: string;
  deviationScore?: number | undefined;
}

/**
 * Violation representation for the dashboard API
 */
export interface DashboardViolation {
  id: string;
  patternId: string;
  patternName: string;
  severity: string;
  file: string;
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  message: string;
  expected: string;
  actual: string;
}

/**
 * File tree node for hierarchical file structure
 * @requirements 8.7 - GET `/api/files` to get the file tree
 */
export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  patternCount?: number;
  violationCount?: number;
  severity?: Severity;
}

/**
 * File details with patterns and violations
 * @requirements 8.8 - GET `/api/files/:path` to get patterns and violations for a specific file
 */
export interface FileDetails {
  path: string;
  language: string;
  lineCount: number;
  patterns: Array<{
    id: string;
    name: string;
    category: PatternCategory;
    locations: SemanticLocation[];
  }>;
  violations: DashboardViolation[];
}

/**
 * Drift configuration
 * @requirements 8.10, 8.11 - Configuration management
 */
export interface DriftConfig {
  version: string;
  detectors: DetectorConfigEntry[];
  severityOverrides: Record<string, Severity>;
  ignorePatterns: string[];
  watchOptions?: {
    debounce: number;
    categories?: PatternCategory[];
  };
}

/**
 * Detector configuration entry
 */
export interface DetectorConfigEntry {
  id: string;
  name: string;
  enabled: boolean;
  category: PatternCategory;
  options?: Record<string, unknown>;
}

/**
 * Dashboard statistics
 * @requirements 8.9 - GET `/api/stats` to get overview statistics
 */
export interface DashboardStats {
  healthScore: number;
  patterns: {
    total: number;
    byStatus: Record<PatternStatus, number>;
    byCategory: Record<PatternCategory, number>;
  };
  violations: {
    total: number;
    bySeverity: Record<Severity, number>;
  };
  files: {
    total: number;
    scanned: number;
  };
  detectors: {
    active: number;
    total: number;
  };
  lastScan: string | null;
}

/**
 * Contract representation for the dashboard API
 */
export interface DashboardContract {
  id: string;
  method: string;
  endpoint: string;
  status: string;
  backend: {
    file: string;
    line: number;
    framework: string;
    responseFields: Array<{ name: string; type: string; optional: boolean }>;
  };
  frontend: Array<{
    file: string;
    line: number;
    library: string;
    responseType?: string;
    responseFields: Array<{ name: string; type: string; optional: boolean }>;
  }>;
  mismatches: Array<{
    fieldPath: string;
    mismatchType: string;
    description: string;
    severity: string;
  }>;
  mismatchCount: number;
  confidence: {
    score: number;
    level: string;
  };
  metadata: {
    firstSeen: string;
    lastSeen: string;
    verifiedAt?: string;
  };
}

/**
 * Contract statistics for the dashboard
 */
export interface DashboardContractStats {
  totalContracts: number;
  byStatus: Record<string, number>;
  byMethod: Record<string, number>;
  totalMismatches: number;
  mismatchesByType: Record<string, number>;
}

// ============================================================================
// Constants
// ============================================================================

const PATTERNS_DIR = 'patterns';
const STATUS_DIRS: PatternStatus[] = ['discovered', 'approved', 'ignored'];

const PATTERN_CATEGORIES: PatternCategory[] = [
  'structural',
  'components',
  'styling',
  'api',
  'auth',
  'errors',
  'data-access',
  'testing',
  'logging',
  'security',
  'config',
  'types',
  'performance',
  'accessibility',
  'documentation',
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a PatternLocation to SemanticLocation
 */
function toSemanticLocation(loc: PatternLocation): SemanticLocation {
  return {
    file: loc.file,
    range: {
      start: { line: loc.line, character: loc.column },
      end: { line: loc.endLine ?? loc.line, character: loc.endColumn ?? loc.column },
    },
  };
}

/**
 * Convert an OutlierLocation to OutlierWithDetails
 */
function toOutlierWithDetails(outlier: OutlierLocation): OutlierWithDetails {
  return {
    file: outlier.file,
    range: {
      start: { line: outlier.line, character: outlier.column },
      end: { line: outlier.endLine ?? outlier.line, character: outlier.endColumn ?? outlier.column },
    },
    reason: outlier.reason,
    deviationScore: outlier.deviationScore,
  };
}

/**
 * Generate a unique violation ID from pattern and outlier
 */
function generateViolationId(patternId: string, outlier: OutlierLocation): string {
  return `${patternId}-${outlier.file}-${outlier.line}-${outlier.column}`;
}

// ============================================================================
// DriftDataReader Class
// ============================================================================

export class DriftDataReader {
  private readonly driftDir: string;
  private readonly patternsDir: string;

  constructor(driftDir: string) {
    this.driftDir = driftDir;
    this.patternsDir = path.join(driftDir, PATTERNS_DIR);
  }

  /**
   * Get the drift directory path
   */
  get directory(): string {
    return this.driftDir;
  }

  /**
   * Get all patterns, optionally filtered
   *
   * @requirements 8.1 - List all patterns
   */
  async getPatterns(query?: PatternQuery): Promise<DashboardPattern[]> {
    const patterns: DashboardPattern[] = [];

    // Read patterns from all status directories
    for (const status of STATUS_DIRS) {
      const statusDir = path.join(this.patternsDir, status);
      
      if (!(await fileExists(statusDir))) {
        continue;
      }

      // Dynamically read all JSON files in this status directory
      try {
        const files = await fs.readdir(statusDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(statusDir, jsonFile);
          const category = jsonFile.replace('.json', '') as PatternCategory;

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const patternFile = JSON.parse(content) as PatternFile;

            for (const stored of patternFile.patterns) {
              const dashboardPattern = this.storedToDashboardPattern(stored, category, status);
              patterns.push(dashboardPattern);
            }
          } catch (error) {
            // Skip files that can't be parsed
            console.error(`Error reading pattern file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error reading status directory ${statusDir}:`, error);
      }
    }

    // Apply filters if provided
    return this.filterPatterns(patterns, query);
  }

  /**
   * Get a single pattern by ID with all locations
   *
   * @requirements 8.2 - Get pattern details with locations
   */
  async getPattern(id: string): Promise<DashboardPatternWithLocations | null> {
    // Search through all status directories dynamically
    for (const status of STATUS_DIRS) {
      const statusDir = path.join(this.patternsDir, status);
      
      if (!(await fileExists(statusDir))) {
        continue;
      }

      try {
        const files = await fs.readdir(statusDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(statusDir, jsonFile);
          const category = jsonFile.replace('.json', '') as PatternCategory;

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const patternFile = JSON.parse(content) as PatternFile;

            const stored = patternFile.patterns.find((p) => p.id === id);
            if (stored) {
              return this.storedToDashboardPatternWithLocations(stored, category, status);
            }
          } catch (error) {
            // Skip files that can't be parsed
            console.error(`Error reading pattern file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error reading status directory ${statusDir}:`, error);
      }
    }

    return null;
  }

  /**
   * Get all violations, optionally filtered
   *
   * Violations are derived from pattern outliers.
   *
   * @requirements 8.6 - List all violations
   */
  async getViolations(query?: ViolationQuery): Promise<DashboardViolation[]> {
    const violations: DashboardViolation[] = [];

    // Read patterns from all status directories dynamically
    for (const status of STATUS_DIRS) {
      const statusDir = path.join(this.patternsDir, status);
      
      if (!(await fileExists(statusDir))) {
        continue;
      }

      try {
        const files = await fs.readdir(statusDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(statusDir, jsonFile);

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const patternFile = JSON.parse(content) as PatternFile;

            for (const stored of patternFile.patterns) {
              // Convert outliers to violations
              for (const outlier of stored.outliers) {
                const violation = this.outlierToViolation(stored, outlier);
                violations.push(violation);
              }
            }
          } catch (error) {
            // Skip files that can't be parsed
            console.error(`Error reading pattern file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error reading status directory ${statusDir}:`, error);
      }
    }

    // Apply filters if provided
    return this.filterViolations(violations, query);
  }

  /**
   * Get dashboard statistics
   * @requirements 8.9 - GET `/api/stats` to get overview statistics
   */
  async getStats(): Promise<DashboardStats> {
    const patterns = await this.getPatterns();
    const violations = await this.getViolations();

    // Count patterns by status
    const byStatus: Record<PatternStatus, number> = {
      discovered: 0,
      approved: 0,
      ignored: 0,
    };
    for (const pattern of patterns) {
      byStatus[pattern.status]++;
    }

    // Count patterns by category - dynamically from actual patterns
    const byCategory: Record<string, number> = {};
    for (const pattern of patterns) {
      const category = pattern.category;
      byCategory[category] = (byCategory[category] || 0) + 1;
    }

    // Count violations by severity
    const bySeverity: Record<Severity, number> = {
      error: 0,
      warning: 0,
      info: 0,
      hint: 0,
    };
    for (const violation of violations) {
      const severity = violation.severity as Severity;
      if (severity in bySeverity) {
        bySeverity[severity]++;
      }
    }

    // Collect unique files from patterns and violations
    const filesSet = new Set<string>();
    for (const pattern of patterns) {
      // We need to get the full pattern to access locations
      const fullPattern = await this.getPattern(pattern.id);
      if (fullPattern) {
        for (const loc of fullPattern.locations) {
          filesSet.add(loc.file);
        }
        for (const outlier of fullPattern.outliers) {
          filesSet.add(outlier.file);
        }
      }
    }

    // Calculate health score
    const healthScore = this.calculateHealthScore(violations, patterns);

    // Get last scan time from pattern metadata
    let lastScan: string | null = null;
    for (const pattern of patterns) {
      if (pattern.metadata.lastSeen) {
        if (!lastScan || pattern.metadata.lastSeen > lastScan) {
          lastScan = pattern.metadata.lastSeen;
        }
      }
    }

    return {
      healthScore,
      patterns: {
        total: patterns.length,
        byStatus,
        byCategory: byCategory as Record<PatternCategory, number>,
      },
      violations: {
        total: violations.length,
        bySeverity,
      },
      files: {
        total: filesSet.size,
        scanned: filesSet.size,
      },
      detectors: {
        active: Object.keys(byCategory).length, // Count unique categories found
        total: Object.keys(byCategory).length,
      },
      lastScan,
    };
  }

  /**
   * Get the file tree structure
   * @requirements 8.7 - GET `/api/files` to get the file tree
   */
  async getFileTree(): Promise<FileTreeNode[]> {
    const patterns = await this.getPatterns();
    const violations = await this.getViolations();

    // Collect file information
    const fileInfo = new Map<string, { patternCount: number; violationCount: number; severity?: Severity }>();

    // Count patterns per file
    for (const pattern of patterns) {
      const fullPattern = await this.getPattern(pattern.id);
      if (fullPattern) {
        for (const loc of fullPattern.locations) {
          const info = fileInfo.get(loc.file) || { patternCount: 0, violationCount: 0 };
          info.patternCount++;
          fileInfo.set(loc.file, info);
        }
      }
    }

    // Count violations per file and track highest severity
    for (const violation of violations) {
      const info = fileInfo.get(violation.file) || { patternCount: 0, violationCount: 0 };
      info.violationCount++;
      
      // Track highest severity
      const violationSeverity = violation.severity as Severity;
      if (!info.severity || this.compareSeverity(violationSeverity, info.severity) > 0) {
        info.severity = violationSeverity;
      }
      
      fileInfo.set(violation.file, info);
    }

    // Build tree structure
    return this.buildFileTree(fileInfo);
  }

  /**
   * Get details for a specific file
   * @requirements 8.8 - GET `/api/files/:path` to get patterns and violations for a specific file
   */
  async getFileDetails(filePath: string): Promise<FileDetails | null> {
    const patterns = await this.getPatterns();
    const violations = await this.getViolations();

    // Find patterns that have locations in this file
    const filePatterns: FileDetails['patterns'] = [];
    for (const pattern of patterns) {
      const fullPattern = await this.getPattern(pattern.id);
      if (fullPattern) {
        const locationsInFile = fullPattern.locations.filter((loc) => loc.file === filePath);
        if (locationsInFile.length > 0) {
          filePatterns.push({
            id: pattern.id,
            name: pattern.name,
            category: pattern.category as PatternCategory,
            locations: locationsInFile,
          });
        }
      }
    }

    // Find violations in this file
    const fileViolations = violations.filter((v) => v.file === filePath);

    // If no patterns or violations found, return null
    if (filePatterns.length === 0 && fileViolations.length === 0) {
      return null;
    }

    // Determine language from file extension
    const language = this.getLanguageFromPath(filePath);

    return {
      path: filePath,
      language,
      lineCount: 0, // We don't have access to actual file content
      patterns: filePatterns,
      violations: fileViolations,
    };
  }

  /**
   * Get configuration
   * @requirements 8.10 - GET `/api/config` to get configuration
   */
  async getConfig(): Promise<DriftConfig> {
    const configPath = path.join(this.driftDir, 'config.json');
    
    if (!(await fileExists(configPath))) {
      // Return default config if none exists
      return this.getDefaultConfig();
    }

    try {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content) as DriftConfig;
    } catch (error) {
      console.error('Error reading config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Update configuration
   * @requirements 8.11 - PUT `/api/config` to update configuration
   */
  async updateConfig(partial: Partial<DriftConfig>): Promise<void> {
    const configPath = path.join(this.driftDir, 'config.json');
    const currentConfig = await this.getConfig();
    
    // Merge the partial config with current config
    const newConfig: DriftConfig = {
      ...currentConfig,
      ...partial,
      detectors: partial.detectors ?? currentConfig.detectors,
      severityOverrides: {
        ...currentConfig.severityOverrides,
        ...partial.severityOverrides,
      },
      ignorePatterns: partial.ignorePatterns ?? currentConfig.ignorePatterns,
    };

    await fs.writeFile(configPath, JSON.stringify(newConfig, null, 2));
  }

  /**
   * Approve a pattern - changes status to 'approved'
   * @requirements 4.4 - Approve pattern
   * @requirements 8.3 - POST `/api/patterns/:id/approve` to approve a pattern
   */
  async approvePattern(id: string): Promise<void> {
    await this.changePatternStatus(id, 'approved');
  }

  /**
   * Ignore a pattern - changes status to 'ignored'
   * @requirements 4.5 - Ignore pattern
   * @requirements 8.4 - POST `/api/patterns/:id/ignore` to ignore a pattern
   */
  async ignorePattern(id: string): Promise<void> {
    await this.changePatternStatus(id, 'ignored');
  }

  /**
   * Delete a pattern - removes from storage
   * @requirements 4.6 - Delete pattern
   * @requirements 8.5 - DELETE `/api/patterns/:id` to delete a pattern
   */
  async deletePattern(id: string): Promise<void> {
    // Find the pattern and its location
    const location = await this.findPatternLocation(id);
    if (!location) {
      throw new Error(`Pattern not found: ${id}`);
    }

    const { filePath } = location;

    // Read the pattern file
    const content = await fs.readFile(filePath, 'utf-8');
    const patternFile = JSON.parse(content) as PatternFile;

    // Remove the pattern
    patternFile.patterns = patternFile.patterns.filter((p) => p.id !== id);
    patternFile.lastUpdated = new Date().toISOString();

    // Write back or delete file if empty
    if (patternFile.patterns.length === 0) {
      await fs.unlink(filePath);
    } else {
      await fs.writeFile(filePath, JSON.stringify(patternFile, null, 2));
    }
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Convert a StoredPattern to DashboardPattern
   */
  private storedToDashboardPattern(
    stored: StoredPattern,
    category: PatternCategory,
    status: PatternStatus
  ): DashboardPattern {
    return {
      id: stored.id,
      name: stored.name,
      category,
      subcategory: stored.subcategory,
      status,
      description: stored.description,
      confidence: {
        score: stored.confidence.score,
        level: stored.confidence.level,
      },
      locationCount: stored.locations.length,
      outlierCount: stored.outliers.length,
      severity: stored.severity,
      metadata: {
        firstSeen: stored.metadata.firstSeen,
        lastSeen: stored.metadata.lastSeen,
        tags: stored.metadata.tags,
      },
    };
  }

  /**
   * Convert a StoredPattern to DashboardPatternWithLocations
   */
  private storedToDashboardPatternWithLocations(
    stored: StoredPattern,
    category: PatternCategory,
    status: PatternStatus
  ): DashboardPatternWithLocations {
    const base = this.storedToDashboardPattern(stored, category, status);
    return {
      ...base,
      locations: stored.locations.map(toSemanticLocation),
      outliers: stored.outliers.map(toOutlierWithDetails),
    };
  }

  /**
   * Convert an outlier to a violation
   */
  private outlierToViolation(
    pattern: StoredPattern,
    outlier: OutlierLocation
  ): DashboardViolation {
    return {
      id: generateViolationId(pattern.id, outlier),
      patternId: pattern.id,
      patternName: pattern.name,
      severity: pattern.severity,
      file: outlier.file,
      range: {
        start: { line: outlier.line, character: outlier.column },
        end: { line: outlier.endLine ?? outlier.line, character: outlier.endColumn ?? outlier.column },
      },
      message: outlier.reason,
      expected: pattern.description,
      actual: outlier.reason,
    };
  }

  /**
   * Filter patterns based on query
   */
  private filterPatterns(
    patterns: DashboardPattern[],
    query?: PatternQuery
  ): DashboardPattern[] {
    if (!query) {
      return patterns;
    }

    return patterns.filter((pattern) => {
      // Filter by category
      if (query.category && pattern.category !== query.category) {
        return false;
      }

      // Filter by status
      if (query.status && pattern.status !== query.status) {
        return false;
      }

      // Filter by minimum confidence
      if (query.minConfidence !== undefined && pattern.confidence.score < query.minConfidence) {
        return false;
      }

      // Filter by search term (name or description)
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        const nameMatch = pattern.name.toLowerCase().includes(searchLower);
        const descMatch = pattern.description.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Filter violations based on query
   */
  private filterViolations(
    violations: DashboardViolation[],
    query?: ViolationQuery
  ): DashboardViolation[] {
    if (!query) {
      return violations;
    }

    return violations.filter((violation) => {
      // Filter by severity
      if (query.severity && violation.severity !== query.severity) {
        return false;
      }

      // Filter by file
      if (query.file && violation.file !== query.file) {
        return false;
      }

      // Filter by pattern ID
      if (query.patternId && violation.patternId !== query.patternId) {
        return false;
      }

      // Filter by search term (message or pattern name)
      if (query.search) {
        const searchLower = query.search.toLowerCase();
        const messageMatch = violation.message.toLowerCase().includes(searchLower);
        const nameMatch = violation.patternName.toLowerCase().includes(searchLower);
        if (!messageMatch && !nameMatch) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Calculate health score based on violations and patterns
   * 
   * Health score formula:
   * - Base score starts at 100
   * - Deduct for violations by severity (error: -10, warning: -3, info: -1, hint: 0)
   * - Bonus for approved patterns (shows intentional architecture)
   * - Clamp to 0-100
   */
  private calculateHealthScore(
    violations: DashboardViolation[],
    patterns: DashboardPattern[]
  ): number {
    let score = 100;

    // Deduct for violations by severity
    for (const violation of violations) {
      switch (violation.severity) {
        case 'error':
          score -= 10;
          break;
        case 'warning':
          score -= 3;
          break;
        case 'info':
          score -= 1;
          break;
        // hint doesn't deduct
      }
    }

    // Bonus for approved patterns (shows intentional architecture)
    if (patterns.length > 0) {
      const approvedCount = patterns.filter((p) => p.status === 'approved').length;
      const approvalRate = approvedCount / patterns.length;
      score += approvalRate * 10;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Build a hierarchical file tree from file information
   */
  private buildFileTree(
    fileInfo: Map<string, { patternCount: number; violationCount: number; severity?: Severity }>
  ): FileTreeNode[] {
    // First pass: collect all unique directory paths and files
    const nodeMap = new Map<string, FileTreeNode>();

    for (const [filePath, info] of fileInfo) {
      const parts = filePath.split('/').filter(Boolean);
      if (parts.length === 0) continue;
      
      let currentPath = '';

      // Create directory nodes
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]!;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          nodeMap.set(currentPath, {
            name: part,
            path: currentPath,
            type: 'directory',
            children: [],
            patternCount: 0,
            violationCount: 0,
          });
        }
      }

      // Create file node
      const fileName = parts[parts.length - 1]!;
      const fullPath = parts.join('/');
      const fileNode: FileTreeNode = {
        name: fileName,
        path: fullPath,
        type: 'file',
        patternCount: info.patternCount,
        violationCount: info.violationCount,
      };
      if (info.severity) {
        fileNode.severity = info.severity;
      }
      nodeMap.set(fullPath, fileNode);
    }

    // Second pass: build parent-child relationships and aggregate counts
    for (const [nodePath, node] of nodeMap) {
      if (node.type === 'file') {
        // Find parent directory
        const parts = nodePath.split('/');
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join('/');
          const parent = nodeMap.get(parentPath);
          if (parent && parent.children) {
            parent.children.push(node);
            // Aggregate counts to parent
            if (parent.patternCount !== undefined && node.patternCount !== undefined) {
              parent.patternCount += node.patternCount;
            }
            if (parent.violationCount !== undefined && node.violationCount !== undefined) {
              parent.violationCount += node.violationCount;
            }
            // Track highest severity
            if (node.severity) {
              if (!parent.severity || this.compareSeverity(node.severity, parent.severity) > 0) {
                parent.severity = node.severity;
              }
            }
          }
        }
      }
    }

    // Third pass: link directories to their parents
    for (const [nodePath, node] of nodeMap) {
      if (node.type === 'directory') {
        const parts = nodePath.split('/');
        if (parts.length > 1) {
          const parentPath = parts.slice(0, -1).join('/');
          const parent = nodeMap.get(parentPath);
          if (parent && parent.children) {
            // Check if not already added
            if (!parent.children.some(c => c.path === node.path)) {
              parent.children.push(node);
            }
            // Aggregate counts to parent
            if (parent.patternCount !== undefined && node.patternCount !== undefined) {
              parent.patternCount += node.patternCount;
            }
            if (parent.violationCount !== undefined && node.violationCount !== undefined) {
              parent.violationCount += node.violationCount;
            }
            // Track highest severity
            if (node.severity) {
              if (!parent.severity || this.compareSeverity(node.severity, parent.severity) > 0) {
                parent.severity = node.severity;
              }
            }
          }
        }
      }
    }

    // Get root nodes (nodes without parents)
    const rootNodes: FileTreeNode[] = [];
    for (const [nodePath, node] of nodeMap) {
      const parts = nodePath.split('/');
      if (parts.length === 1) {
        rootNodes.push(node);
      }
    }

    // Sort and return
    return this.sortFileTree(rootNodes);
  }

  /**
   * Sort file tree: directories first, then alphabetically
   */
  private sortFileTree(nodes: FileTreeNode[]): FileTreeNode[] {
    return nodes
      .map((node) => {
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: this.sortFileTree(node.children),
          };
        }
        return node;
      })
      .sort((a, b) => {
        // Directories first
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Compare severity levels
   * Returns positive if a > b, negative if a < b, 0 if equal
   */
  private compareSeverity(a: Severity, b: Severity): number {
    const order: Record<Severity, number> = {
      error: 4,
      warning: 3,
      info: 2,
      hint: 1,
    };
    return order[a] - order[b];
  }

  /**
   * Get programming language from file path
   */
  private getLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.rb': 'ruby',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
      '.cs': 'csharp',
      '.php': 'php',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.vue': 'vue',
      '.svelte': 'svelte',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.less': 'less',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.xml': 'xml',
      '.md': 'markdown',
      '.sql': 'sql',
      '.sh': 'bash',
      '.bash': 'bash',
      '.zsh': 'zsh',
    };
    return languageMap[ext] || 'plaintext';
  }

  /**
   * Change pattern status (move between status directories)
   */
  private async changePatternStatus(id: string, newStatus: PatternStatus): Promise<void> {
    // Find the pattern and its current location
    const location = await this.findPatternLocation(id);
    if (!location) {
      throw new Error(`Pattern not found: ${id}`);
    }

    const { status: currentStatus, category, filePath, pattern } = location;

    // If already in the target status, nothing to do
    if (currentStatus === newStatus) {
      return;
    }

    // Read the source pattern file
    const sourceContent = await fs.readFile(filePath, 'utf-8');
    const sourceFile = JSON.parse(sourceContent) as PatternFile;

    // Remove pattern from source file
    sourceFile.patterns = sourceFile.patterns.filter((p) => p.id !== id);
    sourceFile.lastUpdated = new Date().toISOString();

    // Write back source file or delete if empty
    if (sourceFile.patterns.length === 0) {
      await fs.unlink(filePath);
    } else {
      await fs.writeFile(filePath, JSON.stringify(sourceFile, null, 2));
    }

    // Add pattern to target status directory
    const targetDir = path.join(this.patternsDir, newStatus);
    const targetPath = path.join(targetDir, `${category}.json`);

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Read or create target file
    let targetFile: PatternFile;
    if (await fileExists(targetPath)) {
      const targetContent = await fs.readFile(targetPath, 'utf-8');
      targetFile = JSON.parse(targetContent) as PatternFile;
    } else {
      targetFile = {
        version: '1.0.0',
        category,
        patterns: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Update pattern metadata if approving
    const updatedPattern = { ...pattern };
    if (newStatus === 'approved') {
      updatedPattern.metadata = {
        ...updatedPattern.metadata,
        approvedAt: new Date().toISOString(),
      };
    }

    // Add pattern to target file
    targetFile.patterns.push(updatedPattern);
    targetFile.lastUpdated = new Date().toISOString();

    // Write target file
    await fs.writeFile(targetPath, JSON.stringify(targetFile, null, 2));
  }

  /**
   * Find a pattern's location in the file system
   */
  private async findPatternLocation(id: string): Promise<{
    status: PatternStatus;
    category: PatternCategory;
    filePath: string;
    pattern: StoredPattern;
  } | null> {
    for (const status of STATUS_DIRS) {
      const statusDir = path.join(this.patternsDir, status);
      
      if (!(await fileExists(statusDir))) {
        continue;
      }

      try {
        const files = await fs.readdir(statusDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const jsonFile of jsonFiles) {
          const filePath = path.join(statusDir, jsonFile);
          const category = jsonFile.replace('.json', '') as PatternCategory;

          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const patternFile = JSON.parse(content) as PatternFile;

            const pattern = patternFile.patterns.find((p) => p.id === id);
            if (pattern) {
              return { status, category, filePath, pattern };
            }
          } catch (error) {
            // Skip files that can't be parsed
            console.error(`Error reading pattern file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error reading status directory ${statusDir}:`, error);
      }
    }

    return null;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): DriftConfig {
    return {
      version: '1.0.0',
      detectors: PATTERN_CATEGORIES.map((category) => ({
        id: category,
        name: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, ' '),
        enabled: true,
        category,
      })),
      severityOverrides: {},
      ignorePatterns: ['node_modules/**', 'dist/**', '.git/**'],
    };
  }

  /**
   * Get code snippet from a file at a specific line with context
   */
  async getCodeSnippet(
    filePath: string,
    line: number,
    contextLines: number = 3
  ): Promise<{ code: string; startLine: number; endLine: number; language: string } | null> {
    // driftDir is .drift/, so workspace root is the parent
    const workspaceRoot = path.dirname(this.driftDir);
    const fullPath = path.join(workspaceRoot, filePath);
    
    try {
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      
      const startLine = Math.max(1, line - contextLines);
      const endLine = Math.min(lines.length, line + contextLines);
      
      const snippetLines = lines.slice(startLine - 1, endLine);
      const code = snippetLines.join('\n');
      
      return {
        code,
        startLine,
        endLine,
        language: this.getLanguageFromPath(filePath),
      };
    } catch (error) {
      console.error(`Error reading file ${fullPath}:`, error);
      return null;
    }
  }

  // ==========================================================================
  // Contract Methods (BE↔FE mismatch detection)
  // ==========================================================================

  /**
   * Get all contracts, optionally filtered
   */
  async getContracts(query?: {
    status?: string;
    method?: string;
    hasMismatches?: boolean;
    search?: string;
  }): Promise<DashboardContract[]> {
    const contracts: DashboardContract[] = [];
    const contractsDir = path.join(this.driftDir, 'contracts');

    const statusDirs = ['discovered', 'verified', 'mismatch', 'ignored'];

    for (const status of statusDirs) {
      const statusDir = path.join(contractsDir, status);
      
      if (!(await fileExists(statusDir))) {
        continue;
      }

      const filePath = path.join(statusDir, 'contracts.json');
      if (!(await fileExists(filePath))) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const contractFile = JSON.parse(content);

        for (const stored of contractFile.contracts) {
          contracts.push({
            ...stored,
            status,
            mismatchCount: stored.mismatches?.length || 0,
          });
        }
      } catch (error) {
        console.error(`Error reading contract file ${filePath}:`, error);
      }
    }

    // Apply filters
    return this.filterContracts(contracts, query);
  }

  /**
   * Get a single contract by ID
   */
  async getContract(id: string): Promise<DashboardContract | null> {
    const contractsDir = path.join(this.driftDir, 'contracts');
    const statusDirs = ['discovered', 'verified', 'mismatch', 'ignored'];

    for (const status of statusDirs) {
      const filePath = path.join(contractsDir, status, 'contracts.json');
      
      if (!(await fileExists(filePath))) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const contractFile = JSON.parse(content);

        const contract = contractFile.contracts.find((c: any) => c.id === id);
        if (contract) {
          return {
            ...contract,
            status,
            mismatchCount: contract.mismatches?.length || 0,
          };
        }
      } catch (error) {
        console.error(`Error reading contract file ${filePath}:`, error);
      }
    }

    return null;
  }

  /**
   * Get contract statistics
   */
  async getContractStats(): Promise<DashboardContractStats> {
    const contracts = await this.getContracts();

    const byStatus: Record<string, number> = {
      discovered: 0,
      verified: 0,
      mismatch: 0,
      ignored: 0,
    };

    const byMethod: Record<string, number> = {
      GET: 0,
      POST: 0,
      PUT: 0,
      PATCH: 0,
      DELETE: 0,
    };

    let totalMismatches = 0;
    const mismatchesByType: Record<string, number> = {};

    for (const contract of contracts) {
      const statusKey = contract.status;
      const methodKey = contract.method;
      if (statusKey in byStatus) {
        byStatus[statusKey] = (byStatus[statusKey] || 0) + 1;
      }
      if (methodKey in byMethod) {
        byMethod[methodKey] = (byMethod[methodKey] || 0) + 1;
      }
      totalMismatches += contract.mismatchCount;

      for (const mismatch of contract.mismatches || []) {
        mismatchesByType[mismatch.mismatchType] = (mismatchesByType[mismatch.mismatchType] || 0) + 1;
      }
    }

    return {
      totalContracts: contracts.length,
      byStatus,
      byMethod,
      totalMismatches,
      mismatchesByType,
    };
  }

  /**
   * Verify a contract
   */
  async verifyContract(id: string): Promise<void> {
    await this.changeContractStatus(id, 'verified');
  }

  /**
   * Ignore a contract
   */
  async ignoreContract(id: string): Promise<void> {
    await this.changeContractStatus(id, 'ignored');
  }

  /**
   * Change contract status
   */
  private async changeContractStatus(id: string, newStatus: string): Promise<void> {
    const contractsDir = path.join(this.driftDir, 'contracts');
    const statusDirs = ['discovered', 'verified', 'mismatch', 'ignored'];

    let foundContract: any = null;

    // Find the contract
    for (const status of statusDirs) {
      const filePath = path.join(contractsDir, status, 'contracts.json');
      
      if (!(await fileExists(filePath))) {
        continue;
      }

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const contractFile = JSON.parse(content);

        const contractIndex = contractFile.contracts.findIndex((c: any) => c.id === id);
        if (contractIndex !== -1) {
          foundContract = contractFile.contracts[contractIndex];

          // Remove from current file
          contractFile.contracts.splice(contractIndex, 1);
          contractFile.lastUpdated = new Date().toISOString();

          if (contractFile.contracts.length === 0) {
            await fs.unlink(filePath);
          } else {
            await fs.writeFile(filePath, JSON.stringify(contractFile, null, 2));
          }
          break;
        }
      } catch (error) {
        console.error(`Error reading contract file ${filePath}:`, error);
      }
    }

    if (!foundContract) {
      throw new Error(`Contract not found: ${id}`);
    }

    // Add to new status directory
    const targetDir = path.join(contractsDir, newStatus);
    const targetPath = path.join(targetDir, 'contracts.json');

    await fs.mkdir(targetDir, { recursive: true });

    let targetFile: any;
    if (await fileExists(targetPath)) {
      const content = await fs.readFile(targetPath, 'utf-8');
      targetFile = JSON.parse(content);
    } else {
      targetFile = {
        version: '1.0.0',
        status: newStatus,
        contracts: [],
        lastUpdated: new Date().toISOString(),
      };
    }

    // Update metadata
    foundContract.metadata = {
      ...foundContract.metadata,
      lastSeen: new Date().toISOString(),
    };

    if (newStatus === 'verified') {
      foundContract.metadata.verifiedAt = new Date().toISOString();
    }

    targetFile.contracts.push(foundContract);
    targetFile.lastUpdated = new Date().toISOString();

    await fs.writeFile(targetPath, JSON.stringify(targetFile, null, 2));
  }

  /**
   * Filter contracts based on query
   */
  private filterContracts(
    contracts: DashboardContract[],
    query?: { status?: string; method?: string; hasMismatches?: boolean; search?: string }
  ): DashboardContract[] {
    if (!query) return contracts;

    return contracts.filter((contract) => {
      if (query.status && contract.status !== query.status) return false;
      if (query.method && contract.method !== query.method) return false;
      if (query.hasMismatches !== undefined) {
        const hasMismatches = contract.mismatchCount > 0;
        if (query.hasMismatches !== hasMismatches) return false;
      }
      if (query.search && !contract.endpoint.toLowerCase().includes(query.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }
}
