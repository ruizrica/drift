#!/usr/bin/env npx tsx
/**
 * Development server script for the Drift Dashboard.
 * 
 * Starts the Express backend server for API/WebSocket on port 3847.
 * Run this alongside `pnpm run dev:client` (Vite) for full hot-reload dev experience.
 * 
 * Usage:
 *   pnpm run dev:server:live   # Starts the actual server (not just tsc watch)
 *   pnpm run dev               # Starts both server and Vite client
 */

import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const port = parseInt(process.env.PORT || '3847', 10);
  const driftDir = process.env.DRIFT_DIR || path.resolve(process.cwd(), '.drift');
  
  console.log('🚀 Starting Drift Dashboard dev server...');
  console.log(`   Port: ${port}`);
  console.log(`   Drift dir: ${driftDir}`);
  console.log('');
  
  // Import from compiled output
  const { DashboardServer } = await import('../dist/server/index.js');
  
  const server = new DashboardServer({
    port,
    driftDir,
    openBrowser: false, // Don't auto-open in dev mode
  });
  
  await server.start();
  
  console.log('');
  console.log('✅ Backend server ready!');
  console.log(`   API: http://localhost:${port}/api`);
  console.log(`   WebSocket: ws://localhost:${port}/ws`);
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
