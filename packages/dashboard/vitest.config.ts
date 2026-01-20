import { defineConfig, mergeConfig } from 'vitest/config';
import rootConfig from '../../vitest.config.js';

/**
 * Vitest configuration for the Drift Dashboard package.
 * Extends the root configuration with package-specific settings.
 */
export default mergeConfig(
  rootConfig,
  defineConfig({
    test: {
      // Override root to include both server and client tests
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**'],
      
      // Use node environment for server tests
      environment: 'node',
    },
  })
);
