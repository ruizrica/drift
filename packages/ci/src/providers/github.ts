/**
 * GitHub Provider - Fetches PR details and posts comments/check runs
 */

import { Octokit } from '@octokit/rest';
import type { PRContext, CIProvider, CommentPayload, Annotation } from '../types.js';

export interface GitHubProviderConfig {
  token: string;
  owner?: string | undefined;
  repo?: string | undefined;
}

export class GitHubProvider {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor(config: GitHubProviderConfig) {
    this.octokit = new Octokit({ auth: config.token });
    this.owner = config.owner ?? '';
    this.repo = config.repo ?? '';
  }

  get provider(): CIProvider {
    return 'github';
  }

  /**
   * Fetch PR context from GitHub
   */
  async getPRContext(prNumber: number, owner?: string, repo?: string): Promise<PRContext> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    const { data: pr } = await this.octokit.pulls.get({
      owner: o,
      repo: r,
      pull_number: prNumber,
    });

    const { data: files } = await this.octokit.pulls.listFiles({
      owner: o,
      repo: r,
      pull_number: prNumber,
      per_page: 100,
    });

    return {
      provider: 'github',
      owner: o,
      repo: r,
      prNumber,
      baseBranch: pr.base.ref,
      headBranch: pr.head.ref,
      headSha: pr.head.sha,
      baseSha: pr.base.sha,
      author: pr.user?.login ?? 'unknown',
      title: pr.title,
      changedFiles: files.map((f: { filename: string }) => f.filename),
      additions: pr.additions,
      deletions: pr.deletions,
    };
  }

  /**
   * Post a comment on the PR
   */
  async postComment(prNumber: number, body: string, owner?: string, repo?: string): Promise<number> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    const { data } = await this.octokit.issues.createComment({
      owner: o,
      repo: r,
      issue_number: prNumber,
      body,
    });

    return data.id;
  }

  /**
   * Update an existing comment
   */
  async updateComment(commentId: number, body: string, owner?: string, repo?: string): Promise<void> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    await this.octokit.issues.updateComment({
      owner: o,
      repo: r,
      comment_id: commentId,
      body,
    });
  }

  /**
   * Create a check run with annotations
   */
  async createCheckRun(
    headSha: string,
    payload: CommentPayload,
    owner?: string,
    repo?: string
  ): Promise<number> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    const conclusion = payload.status === 'success' ? 'success' 
      : payload.status === 'failure' ? 'failure' 
      : 'neutral';

    const { data } = await this.octokit.checks.create({
      owner: o,
      repo: r,
      name: 'Drift CI',
      head_sha: headSha,
      status: 'completed',
      conclusion,
      output: {
        title: 'Drift Analysis',
        summary: payload.body,
        annotations: payload.annotations.map(a => ({
          path: a.path,
          start_line: a.startLine,
          end_line: a.endLine,
          annotation_level: a.level,
          message: a.message,
          title: a.title,
        })),
      },
    });

    return data.id;
  }

  /**
   * Post inline review comments on specific lines
   */
  async postReviewComments(
    prNumber: number,
    headSha: string,
    annotations: Annotation[],
    owner?: string,
    repo?: string
  ): Promise<void> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    if (annotations.length === 0) return;

    const comments = annotations.map(a => ({
      path: a.path,
      line: a.startLine,
      body: `**${a.title}**\n\n${a.message}`,
    }));

    await this.octokit.pulls.createReview({
      owner: o,
      repo: r,
      pull_number: prNumber,
      commit_id: headSha,
      event: 'COMMENT',
      comments,
    });
  }

  /**
   * Get the diff for a PR
   */
  async getPRDiff(prNumber: number, owner?: string, repo?: string): Promise<string> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    const { data } = await this.octokit.pulls.get({
      owner: o,
      repo: r,
      pull_number: prNumber,
      mediaType: { format: 'diff' },
    });

    return data as unknown as string;
  }

  /**
   * Set commit status
   */
  async setCommitStatus(
    sha: string,
    state: 'pending' | 'success' | 'failure' | 'error',
    description: string,
    targetUrl?: string,
    owner?: string,
    repo?: string
  ): Promise<void> {
    const o = owner ?? this.owner;
    const r = repo ?? this.repo;

    await this.octokit.repos.createCommitStatus({
      owner: o,
      repo: r,
      sha,
      state,
      description,
      target_url: targetUrl ?? null,
      context: 'drift-ci',
    });
  }
}

export function createGitHubProvider(config: GitHubProviderConfig): GitHubProvider {
  return new GitHubProvider(config);
}
