/**
 * Analyze any repository using Drift's parsers
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

const targetRepo = process.argv[2] || './test-repos/competitive-intelligence-api';

async function analyzeRepo(): Promise<void> {
  console.log(`\n🔬 Analyzing: ${targetRepo}\n`);
  
  const rootDir = path.resolve(targetRepo);
  const walker = new FileWalker();
  const parserManager = new ParserManager();
  
  parserManager.registerParser(new TypeScriptParser());
  parserManager.registerParser(new PythonParser());
  parserManager.registerParser(new CSSParser());
  parserManager.registerParser(new JSONParser());
  parserManager.registerParser(new MarkdownParser());
  
  const scanOptions: ScanOptions = {
    rootDir,
    ignorePatterns: ['node_modules/**', '.git/**', 'coverage/**', 'dist/**', '__pycache__/**', '.venv/**', 'venv/**'],
    respectGitignore: true,
    respectDriftignore: false,
    followSymlinks: false,
    maxDepth: 50,
  };

  console.log('📁 Discovering files...');
  const result = await walker.walk(scanOptions);
  console.log(`   Found ${result.files.length} files\n`);

  // Group by extension
  const byExt: Map<string, typeof result.files> = new Map();
  for (const file of result.files) {
    const ext = path.extname(file.path).toLowerCase() || 'no-ext';
    if (!byExt.has(ext)) byExt.set(ext, []);
    byExt.get(ext)!.push(file);
  }

  console.log('📊 Files by type:');
  for (const [ext, files] of [...byExt.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 15)) {
    console.log(`   ${ext.padEnd(10)} ${files.length}`);
  }
  console.log();

  // Parse TypeScript files
  const tsFiles = [...(byExt.get('.ts') || []), ...(byExt.get('.tsx') || [])];
  const pyFiles = byExt.get('.py') || [];

  let totalClasses = 0;
  let totalFunctions = 0;
  let totalInterfaces = 0;
  let totalImports = 0;
  let totalLines = 0;

  if (tsFiles.length > 0) {
    console.log(`\n📝 Parsing ${tsFiles.length} TypeScript files...`);
    
    for (const file of tsFiles) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const result = parserManager.parse(file.path, content) as any;
        
        if (result.success) {
          totalClasses += (result.classes || []).length;
          totalFunctions += (result.functions || []).length;
          totalInterfaces += (result.interfaces || []).length;
          totalImports += (result.imports || []).length;
          totalLines += content.split('\n').length;
        }
      } catch {}
    }

    console.log(`   Classes: ${totalClasses}`);
    console.log(`   Functions: ${totalFunctions}`);
    console.log(`   Interfaces: ${totalInterfaces}`);
    console.log(`   Imports: ${totalImports}`);
    console.log(`   Lines: ${totalLines.toLocaleString()}`);
  }

  // Parse Python files
  if (pyFiles.length > 0) {
    console.log(`\n🐍 Parsing ${pyFiles.length} Python files...`);
    
    let pyClasses = 0;
    let pyFunctions = 0;
    let pyImports = 0;
    let pyLines = 0;
    let pyErrors = 0;

    for (const file of pyFiles) {
      try {
        const content = await fs.readFile(file.path, 'utf-8');
        const result = parserManager.parse(file.path, content) as any;
        
        if (result.success) {
          pyClasses += (result.classes || []).length;
          pyFunctions += (result.functions || []).length;
          pyImports += (result.imports || []).length;
          pyLines += content.split('\n').length;
        } else {
          pyErrors++;
        }
      } catch {
        pyErrors++;
      }
    }

    console.log(`   Classes: ${pyClasses}`);
    console.log(`   Functions: ${pyFunctions}`);
    console.log(`   Imports: ${pyImports}`);
    console.log(`   Lines: ${pyLines.toLocaleString()}`);
    if (pyErrors > 0) console.log(`   Parse errors: ${pyErrors}`);
  }

  // Show directory structure
  console.log('\n📂 Top-level structure:');
  const topDirs = new Set<string>();
  for (const file of result.files) {
    const rel = path.relative(rootDir, file.path);
    const parts = rel.split(path.sep);
    if (parts.length > 1) {
      topDirs.add(parts[0]!);
    }
  }
  for (const dir of [...topDirs].sort()) {
    const count = result.files.filter(f => path.relative(rootDir, f.path).startsWith(dir + path.sep)).length;
    console.log(`   ${dir}/ (${count} files)`);
  }

  console.log('\n✅ Analysis complete!\n');
}

analyzeRepo().catch(console.error);
