// ../../vitest.config.ts
import { defineConfig } from "file:///Users/geoffreyfernald/drift/drift/node_modules/.pnpm/vitest@1.6.1_@types+node@20.19.30/node_modules/vitest/dist/config.js";
var vitest_config_default = defineConfig({
  test: {
    // Global test settings
    globals: true,
    environment: "node",
    // Include patterns
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.turbo/**"],
    // Pass when no tests are found (useful during initial setup)
    passWithNoTests: true,
    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/tests/**",
        "**/index.ts"
        // Barrel exports
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    // Reporter configuration
    reporters: ["default"],
    // Timeout settings
    testTimeout: 1e4,
    hookTimeout: 1e4,
    // Pool configuration for parallel execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false
      }
    },
    // Type checking
    typecheck: {
      enabled: false
      // Run separately via tsc
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vdml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9nZW9mZnJleWZlcm5hbGQvZHJpZnQvZHJpZnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9nZW9mZnJleWZlcm5hbGQvZHJpZnQvZHJpZnQvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZ2VvZmZyZXlmZXJuYWxkL2RyaWZ0L2RyaWZ0L3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcblxuLyoqXG4gKiBTaGFyZWQgVml0ZXN0IGNvbmZpZ3VyYXRpb24gZm9yIHRoZSBEcmlmdCBtb25vcmVwby5cbiAqIEluZGl2aWR1YWwgcGFja2FnZXMgY2FuIGV4dGVuZCB0aGlzIGNvbmZpZ3VyYXRpb24uXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHRlc3Q6IHtcbiAgICAvLyBHbG9iYWwgdGVzdCBzZXR0aW5nc1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdub2RlJyxcblxuICAgIC8vIEluY2x1ZGUgcGF0dGVybnNcbiAgICBpbmNsdWRlOiBbJyoqLyoue3Rlc3Qsc3BlY30ue3RzLHRzeH0nXSxcbiAgICBleGNsdWRlOiBbJyoqL25vZGVfbW9kdWxlcy8qKicsICcqKi9kaXN0LyoqJywgJyoqLy50dXJiby8qKiddLFxuXG4gICAgLy8gUGFzcyB3aGVuIG5vIHRlc3RzIGFyZSBmb3VuZCAodXNlZnVsIGR1cmluZyBpbml0aWFsIHNldHVwKVxuICAgIHBhc3NXaXRoTm9UZXN0czogdHJ1ZSxcblxuICAgIC8vIENvdmVyYWdlIGNvbmZpZ3VyYXRpb25cbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICd2OCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2pzb24nLCAnaHRtbCcsICdsY292J10sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgICdub2RlX21vZHVsZXMvKionLFxuICAgICAgICAnZGlzdC8qKicsXG4gICAgICAgICcqKi8qLmQudHMnLFxuICAgICAgICAnKiovKi50ZXN0LnRzJyxcbiAgICAgICAgJyoqLyouc3BlYy50cycsXG4gICAgICAgICcqKi90ZXN0cy8qKicsXG4gICAgICAgICcqKi9pbmRleC50cycsIC8vIEJhcnJlbCBleHBvcnRzXG4gICAgICBdLFxuICAgICAgdGhyZXNob2xkczoge1xuICAgICAgICBzdGF0ZW1lbnRzOiA4MCxcbiAgICAgICAgYnJhbmNoZXM6IDgwLFxuICAgICAgICBmdW5jdGlvbnM6IDgwLFxuICAgICAgICBsaW5lczogODAsXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBSZXBvcnRlciBjb25maWd1cmF0aW9uXG4gICAgcmVwb3J0ZXJzOiBbJ2RlZmF1bHQnXSxcblxuICAgIC8vIFRpbWVvdXQgc2V0dGluZ3NcbiAgICB0ZXN0VGltZW91dDogMTAwMDAsXG4gICAgaG9va1RpbWVvdXQ6IDEwMDAwLFxuXG4gICAgLy8gUG9vbCBjb25maWd1cmF0aW9uIGZvciBwYXJhbGxlbCBleGVjdXRpb25cbiAgICBwb29sOiAndGhyZWFkcycsXG4gICAgcG9vbE9wdGlvbnM6IHtcbiAgICAgIHRocmVhZHM6IHtcbiAgICAgICAgc2luZ2xlVGhyZWFkOiBmYWxzZSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIFR5cGUgY2hlY2tpbmdcbiAgICB0eXBlY2hlY2s6IHtcbiAgICAgIGVuYWJsZWQ6IGZhbHNlLCAvLyBSdW4gc2VwYXJhdGVseSB2aWEgdHNjXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0UixTQUFTLG9CQUFvQjtBQU16VCxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUE7QUFBQSxJQUVKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQTtBQUFBLElBR2IsU0FBUyxDQUFDLDJCQUEyQjtBQUFBLElBQ3JDLFNBQVMsQ0FBQyxzQkFBc0IsY0FBYyxjQUFjO0FBQUE7QUFBQSxJQUc1RCxpQkFBaUI7QUFBQTtBQUFBLElBR2pCLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsUUFBUSxNQUFNO0FBQUEsTUFDekMsU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQTtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFlBQVk7QUFBQSxRQUNWLFlBQVk7QUFBQSxRQUNaLFVBQVU7QUFBQSxRQUNWLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxXQUFXLENBQUMsU0FBUztBQUFBO0FBQUEsSUFHckIsYUFBYTtBQUFBLElBQ2IsYUFBYTtBQUFBO0FBQUEsSUFHYixNQUFNO0FBQUEsSUFDTixhQUFhO0FBQUEsTUFDWCxTQUFTO0FBQUEsUUFDUCxjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUE7QUFBQSxJQUdBLFdBQVc7QUFBQSxNQUNULFNBQVM7QUFBQTtBQUFBLElBQ1g7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
