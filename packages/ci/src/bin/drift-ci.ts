#!/usr/bin/env node
/**
 * Drift CI CLI - Autonomous PR analysis agent
 * 
 * Usage:
 *   drift-ci analyze --pr 123 --owner myorg --repo myrepo
 *   drift-ci analyze --mr 123 --project mygroup/myrepo --provider gitlab
 *   drift-ci local
 *   drift-ci local --sarif > results.sarif
 */

import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import { PRAnalyzer } from '../agent/pr-analyzer.js';
import { GitHubProvider } from '../providers/github.js';
import { GitLabProvider } from '../providers/gitlab.js';
import { GitHubCommentReporter } from '../reporters/github-comment.js';
import { SARIFReporter } from '../reporters/sarif.js';
import { createDriftAdapter } from '../integration/drift-adapter.js';
import { DEFAULT_CONFIG, type AgentConfig, type AnalysisResult } from '../types.js';

const program = new Command();

program
  .name('drift-ci')
  .description('Autonomous CI agent for pattern-aware code analysis')
  .version('0.9.46');

program
  .command('analyze')
  .description('Analyze a pull request or merge request')
  .option('--pr <number>', 'GitHub PR number to analyze')
  .option('--mr <number>', 'GitLab MR number to analyze')
  .option('--owner <owner>', 'Repository owner (GitHub, or set GITHUB_REPOSITORY_OWNER)')
  .option('--repo <repo>', 'Repository name (GitHub, or set GITHUB_REPOSITORY)')
  .option('--project <project>', 'GitLab project ID or path (or set CI_PROJECT_ID)')
  .option('--provider <provider>', 'CI provider: github or gitlab', 'github')
  .option('--token <token>', 'API token (or set GITHUB_TOKEN / GITLAB_TOKEN)')
  .option('--gitlab-host <host>', 'GitLab host URL', 'https://gitlab.com')
  .option('--root <path>', 'Repository root path', '.')
  .option('--no-comment', 'Skip posting comment to PR/MR')
  .option('--no-check', 'Skip creating check run (GitHub only)')
  .option('--fail-on-violation', 'Exit with error on violations')
  .option('--json', 'Output results as JSON')
  .option('--sarif', 'Output results as SARIF')
  .option('--sarif-file <file>', 'Write SARIF output to file')
  .option('--policy <policy>', 'Quality gate policy', 'default')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options: {
    pr?: string;
    mr?: string;
    owner?: string;
    repo?: string;
    project?: string;
    provider: string;
    token?: string;
    gitlabHost?: string;
    root: string;
    comment?: boolean;
    check?: boolean;
    failOnViolation?: boolean;
    json?: boolean;
    sarif?: boolean;
    sarifFile?: string;
    policy?: string;
    verbose?: boolean;
  }) => {
    try {
      const isGitLab = options.provider === 'gitlab' || !!options.mr;
      const prNumber = options.pr ? parseInt(options.pr) : options.mr ? parseInt(options.mr) : null;

      if (!prNumber) {
        throw new Error('Either --pr (GitHub) or --mr (GitLab) is required');
      }

      const config = loadConfig(options, isGitLab);

      let prContext;
      let github: GitHubProvider | null = null;
      let gitlab: GitLabProvider | null = null;

      if (isGitLab) {
        // GitLab flow
        const projectId = options.project ?? process.env['CI_PROJECT_ID'];
        if (!projectId) {
          throw new Error('GitLab project ID required. Set --project or CI_PROJECT_ID environment variable.');
        }
        gitlab = new GitLabProvider({
          token: config.token,
          host: options.gitlabHost ?? 'https://gitlab.com',
          projectId,
        });

        console.log(`Fetching MR !${prNumber}...`);
        prContext = await gitlab.getPRContext(prNumber);
      } else {
        // GitHub flow
        github = new GitHubProvider({
          token: config.token,
          owner: options.owner,
          repo: options.repo,
        });

        const owner = options.owner ?? process.env['GITHUB_REPOSITORY_OWNER'] ?? '';
        const repo = options.repo ?? process.env['GITHUB_REPOSITORY']?.split('/')[1] ?? '';

        console.log(`Fetching PR #${prNumber}...`);
        prContext = await github.getPRContext(prNumber, owner, repo);
      }

      console.log(`Analyzing ${prContext.changedFiles.length} changed files...`);

      // Initialize Drift adapter with all capabilities
      const deps = await createDriftAdapter({
        rootPath: options.root,
        memoryEnabled: config.memoryEnabled,
        verbose: options.verbose ?? false,
        useCallGraph: true,
        useContracts: true,
        useTrends: true,
      });

      // Run analysis
      const analyzer = new PRAnalyzer(deps, config.analysis);
      const result = await analyzer.analyze(prContext, options.root);

      // Output results
      if (options.sarif || options.sarifFile) {
        const sarifReporter = new SARIFReporter();
        const sarifOutput = sarifReporter.generateString(result);

        if (options.sarifFile) {
          await fs.writeFile(options.sarifFile, sarifOutput);
          console.log(`SARIF output written to ${options.sarifFile}`);
        } else {
          console.log(sarifOutput);
        }
      } else if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printResult(result);
      }

      // Post comment if enabled
      if (config.commentOnPR && options.comment !== false) {
        const reporter = new GitHubCommentReporter();
        const payload = reporter.format(result);

        if (isGitLab && gitlab) {
          console.log('\nPosting comment to MR...');
          await gitlab.postComment(prNumber, payload.body);
        } else if (github) {
          console.log('\nPosting comment to PR...');
          await github.postComment(prContext.prNumber, payload.body);
        }
      }

      // Create check run if enabled (GitHub only)
      if (!isGitLab && config.createCheckRun && options.check !== false && github) {
        const reporter = new GitHubCommentReporter();
        const payload = reporter.format(result);

        console.log('Creating check run...');
        await github.createCheckRun(prContext.headSha, payload);
      }

      // Exit with error if violations and fail-on-violation is set
      if (options.failOnViolation && result.status === 'fail') {
        process.exit(1);
      }

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('local')
  .description('Analyze local changes (staged or unstaged)')
  .option('--root <path>', 'Repository root path', '.')
  .option('--staged', 'Only analyze staged changes')
  .option('--json', 'Output results as JSON')
  .option('--sarif', 'Output results as SARIF')
  .option('--sarif-file <file>', 'Write SARIF output to file')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options: { root: string; staged?: boolean; json?: boolean; sarif?: boolean; sarifFile?: string; verbose?: boolean }) => {
    try {
      const { simpleGit } = await import('simple-git');
      const git = simpleGit(options.root);

      // Get changed files
      const status = await git.status();
      const changedFiles = options.staged
        ? status.staged
        : [...status.modified, ...status.not_added, ...status.created];

      if (changedFiles.length === 0) {
        console.log('No changes to analyze');
        return;
      }

      console.log(`Analyzing ${changedFiles.length} changed files...`);

      // Initialize Drift adapter with all capabilities
      const deps = await createDriftAdapter({
        rootPath: options.root,
        memoryEnabled: true,
        verbose: options.verbose ?? false,
        useCallGraph: true,
        useContracts: true,
        useTrends: true,
      });

      // Create mock PR context for local analysis
      const prContext = {
        provider: 'github' as const,
        owner: 'local',
        repo: 'local',
        prNumber: 0,
        baseBranch: 'main',
        headBranch: 'local',
        headSha: 'local',
        baseSha: 'local',
        author: 'local',
        title: 'Local changes',
        changedFiles,
        additions: 0,
        deletions: 0,
      };

      // Run analysis
      const analyzer = new PRAnalyzer(deps, DEFAULT_CONFIG.analysis);
      const result = await analyzer.analyze(prContext, options.root);

      // Output results
      if (options.sarif || options.sarifFile) {
        const sarifReporter = new SARIFReporter();
        const sarifOutput = sarifReporter.generateString(result);

        if (options.sarifFile) {
          await fs.writeFile(options.sarifFile, sarifOutput);
          console.log(`SARIF output written to ${options.sarifFile}`);
        } else {
          console.log(sarifOutput);
        }
      } else if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printResult(result);
      }

    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

interface LoadConfigOptions {
  token?: string;
  comment?: boolean;
  check?: boolean;
  failOnViolation?: boolean;
}

function loadConfig(options: LoadConfigOptions, isGitLab = false): AgentConfig {
  const token = options.token ?? (isGitLab ? process.env['GITLAB_TOKEN'] : process.env['GITHUB_TOKEN']) ?? '';

  if (!token) {
    const envVar = isGitLab ? 'GITLAB_TOKEN' : 'GITHUB_TOKEN';
    throw new Error(`API token required. Set --token or ${envVar} environment variable.`);
  }

  return {
    ...DEFAULT_CONFIG,
    provider: isGitLab ? 'gitlab' : 'github',
    token,
    commentOnPR: options.comment !== false,
    createCheckRun: options.check !== false,
    failOnViolation: options.failOnViolation === true,
  };
}

function printResult(result: AnalysisResult): void {
  const statusEmoji = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
  
  console.log('\n' + '='.repeat(60));
  console.log(`${statusEmoji} Analysis Result: ${result.status.toUpperCase()}`);
  console.log('='.repeat(60));
  console.log(`\n${result.summary}\n`);

  if (result.patterns.violations.length > 0) {
    console.log(`🔴 Pattern Violations: ${result.patterns.violations.length}`);
  }
  if (result.constraints.violated.length > 0) {
    console.log(`🚫 Constraint Violations: ${result.constraints.violated.length}`);
  }
  if (result.security.boundaryViolations.length > 0) {
    console.log(`🔒 Security Issues: ${result.security.boundaryViolations.length}`);
  }
  if (result.patterns.driftScore > 0) {
    console.log(`📊 Drift Score: ${result.patterns.driftScore}/100`);
  }
  if (result.suggestions.length > 0) {
    console.log(`💡 Suggestions: ${result.suggestions.length}`);
  }

  console.log('\n' + '='.repeat(60));
}

program.parse();
