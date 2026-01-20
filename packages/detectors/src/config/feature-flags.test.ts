/**
 * Feature Flags Detector Tests
 *
 * Tests for feature flag pattern detection.
 *
 * @requirements 17.4 - Feature flag patterns
 */

import { describe, it, expect } from 'vitest';
import {
  FeatureFlagsDetector,
  createFeatureFlagsDetector,
  detectBooleanFlags,
  detectEnvFlags,
  detectFlagService,
  detectConditionalRender,
  detectABTest,
  detectRolloutPercentage,
  detectHardcodedFlagViolations,
  analyzeFeatureFlags,
  shouldExcludeFile,
} from './feature-flags.js';
import type { DetectionContext, ProjectContext } from '../base/index.js';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(file: string, content: string = ''): DetectionContext {
  const projectContext: ProjectContext = {
    rootDir: '/project',
    files: [file],
    config: {},
  };

  return {
    file,
    content,
    ast: null,
    imports: [],
    exports: [],
    projectContext,
    language: 'typescript',
    extension: '.ts',
    isTestFile: file.includes('.test.') || file.includes('.spec.'),
    isTypeDefinition: file.endsWith('.d.ts'),
  };
}

// ============================================================================
// shouldExcludeFile Tests
// ============================================================================

describe('shouldExcludeFile', () => {
  it('should exclude test files', () => {
    expect(shouldExcludeFile('config.test.ts')).toBe(true);
    expect(shouldExcludeFile('config.spec.ts')).toBe(true);
  });

  it('should exclude __tests__ directory', () => {
    expect(shouldExcludeFile('__tests__/config.ts')).toBe(true);
  });

  it('should exclude type definition files', () => {
    expect(shouldExcludeFile('config.d.ts')).toBe(true);
  });

  it('should exclude node_modules', () => {
    expect(shouldExcludeFile('node_modules/feature-flags/index.js')).toBe(true);
  });

  it('should not exclude regular source files', () => {
    expect(shouldExcludeFile('src/config/flags.ts')).toBe(false);
    expect(shouldExcludeFile('lib/features.ts')).toBe(false);
  });
});

// ============================================================================
// Boolean Flag Detection Tests
// ============================================================================

describe('detectBooleanFlags', () => {
  it('should detect isFeatureEnabled calls', () => {
    const content = `const enabled = isFeatureEnabled('new-ui');`;
    const results = detectBooleanFlags(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.type).toBe('boolean-flag');
    expect(results[0]?.flagName).toBe('new-ui');
  });

  it('should detect useFeatureFlag hook', () => {
    const content = `const flag = useFeatureFlag('dark-mode');`;
    const results = detectBooleanFlags(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect Python is_feature_enabled', () => {
    const content = `enabled = is_feature_enabled('new_ui')`;
    const results = detectBooleanFlags(content, 'config.py');
    
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Env Flag Detection Tests
// ============================================================================

describe('detectEnvFlags', () => {
  it('should detect FEATURE_ prefixed env vars', () => {
    const content = `const enabled = process.env.FEATURE_NEW_UI;`;
    const results = detectEnvFlags(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.type).toBe('env-flag');
  });

  it('should detect FF_ prefixed env vars', () => {
    const content = `const flag = process.env.FF_DARK_MODE;`;
    const results = detectEnvFlags(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect ENABLE_ prefixed env vars', () => {
    const content = `const enabled = process.env.ENABLE_ANALYTICS;`;
    const results = detectEnvFlags(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect Python os.environ feature flags', () => {
    const content = `enabled = os.environ['FEATURE_NEW_UI']`;
    const results = detectEnvFlags(content, 'config.py');
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect Python os.getenv feature flags', () => {
    const content = `enabled = os.getenv('ENABLE_DARK_MODE')`;
    const results = detectEnvFlags(content, 'config.py');
    
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Flag Service Detection Tests
// ============================================================================

describe('detectFlagService', () => {
  it('should detect LaunchDarkly', () => {
    const content = `import { LaunchDarkly } from 'launchdarkly-js-client-sdk';`;
    const results = detectFlagService(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.service).toBe('launchdarkly');
  });

  it('should detect Unleash', () => {
    const content = `import { Unleash } from 'unleash-client';`;
    const results = detectFlagService(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.service).toBe('unleash');
  });

  it('should detect GrowthBook', () => {
    const content = `import { GrowthBook } from '@growthbook/growthbook-react';`;
    const results = detectFlagService(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.service).toBe('growthbook');
  });
});

// ============================================================================
// Conditional Render Detection Tests
// ============================================================================

describe('detectConditionalRender', () => {
  it('should detect conditional JSX with feature flag', () => {
    const content = `{isFeatureEnabled && <NewComponent />}`;
    const results = detectConditionalRender(content, 'component.tsx');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.type).toBe('conditional-render');
  });

  it('should detect if statement with feature check', () => {
    const content = `if (isFeatureEnabled('new-ui')) { render(); }`;
    const results = detectConditionalRender(content, 'component.tsx');
    
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// A/B Test Detection Tests
// ============================================================================

describe('detectABTest', () => {
  it('should detect abTest function', () => {
    const content = `const variant = abTest('button-color');`;
    const results = detectABTest(content, 'experiment.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.type).toBe('ab-test');
  });

  it('should detect experiment patterns', () => {
    const content = `const experiment = useExperiment('checkout-flow');`;
    const results = detectABTest(content, 'experiment.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect variant patterns', () => {
    const content = `const variant = getVariant('pricing-page');`;
    const results = detectABTest(content, 'experiment.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Rollout Percentage Detection Tests
// ============================================================================

describe('detectRolloutPercentage', () => {
  it('should detect rollout patterns', () => {
    const content = `const rollout = gradualRollout('new-feature', 25);`;
    const results = detectRolloutPercentage(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.type).toBe('rollout-percentage');
  });

  it('should detect canary patterns', () => {
    const content = `if (canary('new-api')) { useNewApi(); }`;
    const results = detectRolloutPercentage(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Hardcoded Flag Violation Tests
// ============================================================================

describe('detectHardcodedFlagViolations', () => {
  it('should detect hardcoded feature flags', () => {
    const content = `const featureEnabled = true;`;
    const results = detectHardcodedFlagViolations(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.type).toBe('hardcoded-flag');
    expect(results[0]?.severity).toBe('medium');
  });

  it('should detect hardcoded ENABLE_ flags', () => {
    const content = `const ENABLE_NEW_UI = false;`;
    const results = detectHardcodedFlagViolations(content, 'config.ts');
    
    expect(results.length).toBeGreaterThan(0);
  });

  it('should detect Python hardcoded flags', () => {
    const content = `feature_enabled = True`;
    const results = detectHardcodedFlagViolations(content, 'config.py');
    
    expect(results.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// Full Analysis Tests
// ============================================================================

describe('analyzeFeatureFlags', () => {
  it('should return empty analysis for excluded files', () => {
    const content = `const enabled = isFeatureEnabled('test');`;
    const analysis = analyzeFeatureFlags(content, 'config.test.ts');
    
    expect(analysis.patterns.length).toBe(0);
    expect(analysis.violations.length).toBe(0);
    expect(analysis.confidence).toBe(1.0);
  });

  it('should detect multiple patterns', () => {
    const content = `
      const enabled = isFeatureEnabled('new-ui');
      const flag = process.env.FEATURE_DARK_MODE;
    `;
    const analysis = analyzeFeatureFlags(content, 'config.ts');
    
    expect(analysis.patterns.length).toBeGreaterThan(0);
    expect(analysis.hasFeatureFlags).toBe(true);
  });

  it('should detect flag service usage', () => {
    const content = `
      import { LaunchDarkly } from 'launchdarkly-js-client-sdk';
      const flag = ldClient.variation('new-feature');
    `;
    const analysis = analyzeFeatureFlags(content, 'config.ts');
    
    expect(analysis.usesService).toBe(true);
  });

  it('should collect unique flag names', () => {
    const content = `
      const a = isFeatureEnabled('feature-a');
      const b = isFeatureEnabled('feature-b');
    `;
    const analysis = analyzeFeatureFlags(content, 'config.ts');
    
    expect(analysis.flagNames.length).toBe(2);
    expect(analysis.flagNames).toContain('feature-a');
    expect(analysis.flagNames).toContain('feature-b');
  });
});

// ============================================================================
// Detector Class Tests
// ============================================================================

describe('FeatureFlagsDetector', () => {
  it('should create detector with correct properties', () => {
    const detector = createFeatureFlagsDetector();
    
    expect(detector.id).toBe('config/feature-flags');
    expect(detector.category).toBe('config');
    expect(detector.supportedLanguages).toContain('typescript');
    expect(detector.supportedLanguages).toContain('javascript');
    expect(detector.supportedLanguages).toContain('python');
  });

  it('should return empty result for unsupported languages', async () => {
    const detector = new FeatureFlagsDetector();
    const context = createMockContext('styles.css', 'body { color: red; }');
    context.language = 'css';
    
    const result = await detector.detect(context);
    
    expect(result.patterns.length).toBe(0);
    expect(result.violations.length).toBe(0);
  });

  it('should detect patterns in TypeScript files', async () => {
    const detector = new FeatureFlagsDetector();
    const content = `const enabled = isFeatureEnabled('new-ui');`;
    const context = createMockContext('config.ts', content);
    
    const result = await detector.detect(context);
    
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should detect patterns in Python files', async () => {
    const detector = new FeatureFlagsDetector();
    const content = `enabled = is_feature_enabled('new_ui')`;
    const context = createMockContext('config.py', content);
    context.language = 'python';
    context.extension = '.py';
    
    const result = await detector.detect(context);
    
    expect(result.confidence).toBeGreaterThan(0);
  });
});
