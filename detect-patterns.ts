/**
 * Run Drift's pattern detectors on itself - using raw detection functions
 */

import { FileWalker, type ScanOptions } from './packages/core/dist/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import raw detection functions that we know exist
import { detectFileNamingPatterns } from './packages/detectors/dist/structural/file-naming.js';
import { detectDirectoryPatterns } from './packages/detectors/dist/structural/directory-structure.js';
import { detectRoutePatterns } from './packages/detectors/dist/api/route-structure.js';
import { detectResponseEnvelopePatterns } from './packages/detectors/dist/api/response-envelope.js';
import { detectPaginationPatterns } from './packages/detectors/dist/api/pagination.js';
import { detectMiddlewarePatterns } from './packages/detectors/dist/auth/middleware-usage.js';
import { detectPermissionPatterns } from './packages/detectors/dist/auth/permission-checks.js';
import { detectTestFileNaming } from './packages/detectors/dist/testing/file-naming.js';
import { extractDescribeBlocks } from './packages/detectors/dist/testing/describe-naming.js';
import { detectStructuredLogging } from './packages/detectors/dist/logging/structured-format.js';
import { detectLogLevelPatterns } from './packages/detectors/dist/logging/log-levels.js';
import { detectCustomErrorClasses } from './packages/detectors/dist/errors/exception-hierarchy.js';
import { detectSqlInjectionRisks } from './packages/detectors/dist/security/sql-injection.js';
import { detectSecretPatterns } from './packages/detectors/dist/security/secret-management.js';
import { detectRepositoryClasses } from './packages/detectors/dist/data-access/repository-pattern.js';
import { detectQueryPatterns } from './packages/detectors/dist/data-access/query-patterns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface DetectorDef {
  name: string;
  category: string;
  fn: (content: string, filePath?: string) => any[];
  filter?: (path: string) => boolean;
}

async function detectPatterns(): Promise<void> {
  console.log('🔍 Drift Pattern Detection\n');
  
  const rootDir = __dirname;
  const walker = new FileWalker();
  
  const scanOptions: ScanOptions = {
    rootDir,
    ignorePatterns: ['node_modules/**', '.git/**', 'coverage/**', '.turbo/**', 'dist/**'],
    respectGitignore: false,
    respectDriftignore: false,
    followSymlinks: false,
    maxDepth: 50,
  };

  const result = await walker.walk(scanOptions);
  const tsFiles = result.files.filter(f => 
    f.path.endsWith('.ts') && 
    !f.path.includes('node_modules') &&
    !f.path.includes('/dist/')
  );
  
  console.log(`📁 Scanning ${tsFiles.length} TypeScript files...\n`);

  const detectors: DetectorDef[] = [
    { name: 'File Naming', category: 'Structural', fn: detectFileNamingPatterns },
    { name: 'Directory Structure', category: 'Structural', fn: detectDirectoryPatterns },
    { name: 'Route Patterns', category: 'API', fn: detectRoutePatterns },
    { name: 'Response Envelope', category: 'API', fn: detectResponseEnvelopePatterns },
    { name: 'Pagination', category: 'API', fn: detectPaginationPatterns },
    { name: 'Middleware', category: 'Auth', fn: detectMiddlewarePatterns },
    { name: 'Permissions', category: 'Auth', fn: detectPermissionPatterns },
    { name: 'Test File Naming', category: 'Testing', fn: detectTestFileNaming },
    { name: 'Describe Blocks', category: 'Testing', fn: extractDescribeBlocks, filter: p => p.includes('.test.') },
    { name: 'Structured Logging', category: 'Logging', fn: detectStructuredLogging },
    { name: 'Log Levels', category: 'Logging', fn: detectLogLevelPatterns },
    { name: 'Exception Hierarchy', category: 'Errors', fn: detectCustomErrorClasses },
    { name: 'SQL Injection', category: 'Security', fn: detectSqlInjectionRisks },
    { name: 'Secrets', category: 'Security', fn: detectSecretPatterns },
    { name: 'Repository Pattern', category: 'Data Access', fn: detectRepositoryClasses },
    { name: 'Query Patterns', category: 'Data Access', fn: detectQueryPatterns },
  ];

  const results: { name: string; category: string; count: number; files: string[]; examples: string[] }[] = [];

  for (const { name, category, fn, filter } of detectors) {
    process.stdout.write(`   ${name}...`);
    const matches: { file: string; patterns: any[] }[] = [];
    
    const filesToScan = filter ? tsFiles.filter(f => filter(f.path)) : tsFiles;
    
    for (const file of filesToScan) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const relativePath = path.relative(rootDir, file.path);
        const patterns = fn(content, relativePath);
        
        if (patterns && patterns.length > 0) {
          matches.push({ file: relativePath, patterns });
        }
      } catch {
        // Skip
      }
    }

    const totalCount = matches.reduce((sum, m) => sum + m.patterns.length, 0);
    console.log(` ${totalCount} patterns in ${matches.length} files`);
    
    if (totalCount > 0) {
      const examples = matches.slice(0, 3).flatMap(m => 
        m.patterns.slice(0, 2).map((p: any) => p.type || p.name || p.pattern || 'match')
      );
      results.push({ 
        name, 
        category, 
        count: totalCount, 
        files: matches.map(m => m.file),
        examples: [...new Set(examples)]
      });
    }
  }

  console.log('\n');

  // Print results by category
  const categories = [...new Set(results.map(r => r.category))];
  
  console.log('═'.repeat(70));
  console.log('📊 DETECTED PATTERNS');
  console.log('═'.repeat(70));
  
  for (const category of categories) {
    const categoryResults = results.filter(r => r.category === category);
    const totalPatterns = categoryResults.reduce((sum, r) => sum + r.count, 0);
    
    console.log(`\n🏷️  ${category.toUpperCase()} (${totalPatterns} total)`);
    console.log('─'.repeat(70));
    
    for (const result of categoryResults) {
      console.log(`\n   📌 ${result.name}`);
      console.log(`      Count: ${result.count} patterns in ${result.files.length} files`);
      if (result.examples.length > 0) {
        console.log(`      Types: ${result.examples.slice(0, 5).join(', ')}`);
      }
      console.log(`      Files:`);
      for (const file of result.files.slice(0, 5)) {
        console.log(`         • ${file}`);
      }
      if (result.files.length > 5) {
        console.log(`         ... and ${result.files.length - 5} more`);
      }
    }
  }

  // Summary
  console.log('\n');
  console.log('═'.repeat(70));
  console.log('📈 SUMMARY');
  console.log('═'.repeat(70));
  const total = results.reduce((sum, r) => sum + r.count, 0);
  console.log(`\n   Total patterns detected: ${total}`);
  console.log(`   Detector types with hits: ${results.length}/${detectors.length}`);
  console.log(`   Categories with patterns: ${categories.length}`);
  
  console.log('\n   Breakdown by category:');
  for (const cat of categories) {
    const count = results.filter(r => r.category === cat).reduce((sum, r) => sum + r.count, 0);
    const bar = '█'.repeat(Math.ceil(count / 50));
    console.log(`      ${cat.padEnd(15)} ${count.toString().padStart(5)} ${bar}`);
  }
  
  console.log('\n✅ Analysis complete!\n');
}

detectPatterns().catch(console.error);
