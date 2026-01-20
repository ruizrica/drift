/**
 * Drift Self-Analysis
 * 
 * Run Drift's parsers and detectors on its own codebase
 */

import { 
  FileWalker, 
  ParserManager, 
  TypeScriptParser,
  PythonParser,
  CSSParser,
  JSONParser,
  MarkdownParser,
  type ScanOptions 
} from './packages/core/dist/index.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ParsedFileData {
  path: string;
  language: string;
  imports: number;
  exports: number;
  classes: string[];
  functions: string[];
  interfaces: string[];
  typeAliases: string[];
  lines: number;
  size: number;
}

async function analyzeCodebase(): Promise<void> {
  console.log('🔬 Drift Self-Analysis\n');
  console.log('Running Drift\'s parsers on its own codebase...\n');
  
  const rootDir = __dirname;
  const walker = new FileWalker();
  const parserManager = new ParserManager();
  
  // Register parsers
  parserManager.registerParser(new TypeScriptParser());
  parserManager.registerParser(new PythonParser());
  parserManager.registerParser(new CSSParser());
  parserManager.registerParser(new JSONParser());
  parserManager.registerParser(new MarkdownParser());
  
  const scanOptions: ScanOptions = {
    rootDir,
    ignorePatterns: ['node_modules/**', '.git/**', 'coverage/**', '.turbo/**', 'dist/**'],
    respectGitignore: false,
    respectDriftignore: false,
    followSymlinks: false,
    maxDepth: 50,
    computeHashes: false,
  };

  // Discover files
  console.log('📁 Discovering files...');
  const result = await walker.walk(scanOptions);
  console.log(`   Found ${result.files.length} files\n`);

  // Filter to source TypeScript files (not tests, not dist)
  const sourceFiles = result.files.filter(f => 
    f.path.endsWith('.ts') && 
    !f.path.endsWith('.test.ts') &&
    !f.path.endsWith('.spec.ts') &&
    !f.path.includes('/dist/') &&
    !f.path.includes('node_modules')
  );
  
  console.log(`📝 Analyzing ${sourceFiles.length} TypeScript source files...\n`);

  const parsedFiles: ParsedFileData[] = [];
  const allClasses: Map<string, string> = new Map(); // class -> file
  const allFunctions: Map<string, string> = new Map();
  const allInterfaces: Map<string, string> = new Map();
  const allTypeAliases: Map<string, string> = new Map();
  const importSources: Map<string, number> = new Map(); // module -> count
  
  let totalImports = 0;
  let totalExports = 0;
  let totalLines = 0;
  let totalSize = 0;
  let parseErrors = 0;

  for (const file of sourceFiles) {
    try {
      const content = await fs.readFile(file.path, 'utf-8');
      const relativePath = path.relative(rootDir, file.path);
      const result = parserManager.parse(file.path, content) as any;
      
      if (!result.success) {
        parseErrors++;
        continue;
      }

      const lines = content.split('\n').length;
      const size = content.length;
      totalLines += lines;
      totalSize += size;

      // Extract data
      const imports = result.imports || [];
      const exports = result.exports || [];
      const classes = result.classes || [];
      const functions = result.functions || [];
      const interfaces = result.interfaces || [];
      const typeAliases = result.typeAliases || [];

      totalImports += imports.length;
      totalExports += exports.length;

      // Track import sources
      for (const imp of imports) {
        const source = imp.moduleSpecifier;
        importSources.set(source, (importSources.get(source) || 0) + 1);
      }

      // Track declarations
      for (const cls of classes) {
        allClasses.set(cls.name, relativePath);
      }
      for (const fn of functions) {
        allFunctions.set(fn.name, relativePath);
      }
      for (const iface of interfaces) {
        allInterfaces.set(iface.name, relativePath);
      }
      for (const ta of typeAliases) {
        allTypeAliases.set(ta.name, relativePath);
      }

      parsedFiles.push({
        path: relativePath,
        language: 'typescript',
        imports: imports.length,
        exports: exports.length,
        classes: classes.map((c: any) => c.name),
        functions: functions.map((f: any) => f.name),
        interfaces: interfaces.map((i: any) => i.name),
        typeAliases: typeAliases.map((t: any) => t.name),
        lines,
        size,
      });
    } catch (e) {
      parseErrors++;
    }
  }

  // Print results
  console.log('═'.repeat(60));
  console.log('📊 CODEBASE OVERVIEW');
  console.log('═'.repeat(60));
  console.log(`   Files parsed:      ${parsedFiles.length}`);
  console.log(`   Parse errors:      ${parseErrors}`);
  console.log(`   Total lines:       ${totalLines.toLocaleString()}`);
  console.log(`   Total size:        ${(totalSize / 1024).toFixed(0)} KB`);
  console.log();

  console.log('═'.repeat(60));
  console.log('📦 DECLARATIONS');
  console.log('═'.repeat(60));
  console.log(`   Classes:           ${allClasses.size}`);
  console.log(`   Functions:         ${allFunctions.size}`);
  console.log(`   Interfaces:        ${allInterfaces.size}`);
  console.log(`   Type Aliases:      ${allTypeAliases.size}`);
  console.log(`   Total Imports:     ${totalImports}`);
  console.log(`   Total Exports:     ${totalExports}`);
  console.log();

  // Top classes by package
  console.log('═'.repeat(60));
  console.log('🏛️  CLASSES BY PACKAGE');
  console.log('═'.repeat(60));
  const classesByPackage: Map<string, string[]> = new Map();
  for (const [name, file] of allClasses) {
    const pkg = file.split('/')[1] || 'root';
    if (!classesByPackage.has(pkg)) classesByPackage.set(pkg, []);
    classesByPackage.get(pkg)!.push(name);
  }
  for (const [pkg, classes] of Array.from(classesByPackage.entries()).sort()) {
    console.log(`\n   📦 ${pkg} (${classes.length} classes)`);
    for (const cls of classes.slice(0, 10)) {
      console.log(`      • ${cls}`);
    }
    if (classes.length > 10) {
      console.log(`      ... and ${classes.length - 10} more`);
    }
  }
  console.log();

  // Top interfaces
  console.log('═'.repeat(60));
  console.log('📋 TOP INTERFACES');
  console.log('═'.repeat(60));
  const interfaceList = Array.from(allInterfaces.entries()).slice(0, 30);
  for (const [name, file] of interfaceList) {
    const shortFile = file.split('/').slice(-2).join('/');
    console.log(`   ${name.padEnd(40)} ${shortFile}`);
  }
  if (allInterfaces.size > 30) {
    console.log(`   ... and ${allInterfaces.size - 30} more interfaces`);
  }
  console.log();

  // Top type aliases
  console.log('═'.repeat(60));
  console.log('🏷️  TOP TYPE ALIASES');
  console.log('═'.repeat(60));
  const typeList = Array.from(allTypeAliases.entries()).slice(0, 30);
  for (const [name, file] of typeList) {
    const shortFile = file.split('/').slice(-2).join('/');
    console.log(`   ${name.padEnd(40)} ${shortFile}`);
  }
  if (allTypeAliases.size > 30) {
    console.log(`   ... and ${allTypeAliases.size - 30} more type aliases`);
  }
  console.log();

  // Top import sources
  console.log('═'.repeat(60));
  console.log('📥 TOP IMPORT SOURCES');
  console.log('═'.repeat(60));
  const sortedImports = Array.from(importSources.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);
  for (const [source, count] of sortedImports) {
    console.log(`   ${count.toString().padStart(4)}x  ${source}`);
  }
  console.log();

  // Largest files
  console.log('═'.repeat(60));
  console.log('📏 LARGEST FILES (by lines)');
  console.log('═'.repeat(60));
  const largestFiles = parsedFiles
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 15);
  for (const file of largestFiles) {
    console.log(`   ${file.lines.toString().padStart(5)} lines  ${file.path}`);
  }
  console.log();

  // Files with most declarations
  console.log('═'.repeat(60));
  console.log('🎯 FILES WITH MOST DECLARATIONS');
  console.log('═'.repeat(60));
  const byDeclarations = parsedFiles
    .map(f => ({
      ...f,
      totalDecl: f.classes.length + f.functions.length + f.interfaces.length + f.typeAliases.length
    }))
    .sort((a, b) => b.totalDecl - a.totalDecl)
    .slice(0, 15);
  for (const file of byDeclarations) {
    console.log(`   ${file.totalDecl.toString().padStart(3)} decl  ${file.path}`);
    if (file.classes.length > 0) console.log(`           classes: ${file.classes.join(', ')}`);
  }
  console.log();

  // Export analysis
  console.log('═'.repeat(60));
  console.log('📤 EXPORT ANALYSIS');
  console.log('═'.repeat(60));
  const highExportFiles = parsedFiles
    .filter(f => f.exports > 5)
    .sort((a, b) => b.exports - a.exports)
    .slice(0, 15);
  for (const file of highExportFiles) {
    console.log(`   ${file.exports.toString().padStart(3)} exports  ${file.path}`);
  }
  console.log();

  console.log('✅ Analysis complete!\n');
}

analyzeCodebase().catch(console.error);
