/**
 * GitLab Provider - Fetches MR details and posts comments/pipelines
 */

import type { PRContext, CIProvider, CommentPayload, Annotation } from '../types.js';

export interface GitLabProviderConfig {
  token: string;
  host?: string;
  projectId?: string | number;
}

interface GitLabMR {
  iid: number;
  title: string;
  source_branch: string;
  target_branch: string;
  sha: string;
  diff_refs: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
  author: {
    username: string;
  };
  changes_count: string;
}

interface GitLabMRChange {
  old_path: string;
  new_path: string;
  diff: string;
}

interface GitLabMRChanges {
  changes: GitLabMRChange[];
}

export class GitLabProvider {
  private token: string;
  private host: string;
  private projectId: string | number;

  constructor(config: GitLabProviderConfig) {
    this.token = config.token;
    this.host = config.host ?? 'https://gitlab.com';
    this.projectId = config.projectId ?? '';
  }

  get provider(): CIProvider {
    return 'gitlab';
  }

  /**
   * Fetch MR context from GitLab
   */
  async getPRContext(mrNumber: number, projectId?: string | number): Promise<PRContext> {
    const pid = projectId ?? this.projectId;

    const mr = await this.apiGet<GitLabMR>(`/projects/${encodeURIComponent(String(pid))}/merge_requests/${mrNumber}`);
    const changes = await this.apiGet<GitLabMRChanges>(`/projects/${encodeURIComponent(String(pid))}/merge_requests/${mrNumber}/changes`);

    // Calculate additions/deletions from diffs
    let additions = 0;
    let deletions = 0;
    for (const change of changes.changes) {
      const lines = change.diff.split('\n');
      for (const line of lines) {
        if (line.startsWith('+') && !line.startsWith('+++')) additions++;
        if (line.startsWith('-') && !line.startsWith('---')) deletions++;
      }
    }

    return {
      provider: 'gitlab',
      owner: String(pid).split('/')[0] ?? '',
      repo: String(pid).split('/')[1] ?? String(pid),
      prNumber: mrNumber,
      baseBranch: mr.target_branch,
      headBranch: mr.source_branch,
      headSha: mr.diff_refs.head_sha,
      baseSha: mr.diff_refs.base_sha,
      author: mr.author.username,
      title: mr.title,
      changedFiles: changes.changes.map(c => c.new_path),
      additions,
      deletions,
    };
  }

  /**
   * Post a comment on the MR
   */
  async postComment(mrNumber: number, body: string, projectId?: string | number): Promise<number> {
    const pid = projectId ?? this.projectId;

    const response = await this.apiPost<{ id: number }>(
      `/projects/${encodeURIComponent(String(pid))}/merge_requests/${mrNumber}/notes`,
      { body }
    );

    return response.id;
  }

  /**
   * Update an existing comment
   */
  async updateComment(mrNumber: number, noteId: number, body: string, projectId?: string | number): Promise<void> {
    const pid = projectId ?? this.projectId;

    await this.apiPut(
      `/projects/${encodeURIComponent(String(pid))}/merge_requests/${mrNumber}/notes/${noteId}`,
      { body }
    );
  }

  /**
   * Create inline discussion threads on specific lines
   */
  async postReviewComments(
    mrNumber: number,
    headSha: string,
    baseSha: string,
    annotations: Annotation[],
    projectId?: string | number
  ): Promise<void> {
    const pid = projectId ?? this.projectId;

    for (const a of annotations) {
      await this.apiPost(
        `/projects/${encodeURIComponent(String(pid))}/merge_requests/${mrNumber}/discussions`,
        {
          body: `**${a.title}**\n\n${a.message}`,
          position: {
            base_sha: baseSha,
            head_sha: headSha,
            start_sha: baseSha,
            position_type: 'text',
            new_path: a.path,
            new_line: a.startLine,
          },
        }
      );
    }
  }

  /**
   * Set commit status
   */
  async setCommitStatus(
    sha: string,
    state: 'pending' | 'running' | 'success' | 'failed' | 'canceled',
    name: string,
    description: string,
    targetUrl?: string,
    projectId?: string | number
  ): Promise<void> {
    const pid = projectId ?? this.projectId;

    await this.apiPost(
      `/projects/${encodeURIComponent(String(pid))}/statuses/${sha}`,
      {
        state,
        name,
        description,
        target_url: targetUrl,
        context: 'drift-ci',
      }
    );
  }

  /**
   * Create a code quality report (GitLab Code Quality)
   */
  formatCodeQualityReport(payload: CommentPayload): Array<{
    description: string;
    check_name: string;
    fingerprint: string;
    severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker';
    location: { path: string; lines: { begin: number } };
  }> {
    return payload.annotations.map((a, i) => ({
      description: a.message,
      check_name: a.title,
      fingerprint: `drift-${a.path}-${a.startLine}-${i}`,
      severity: a.level === 'failure' ? 'critical' : a.level === 'warning' ? 'major' : 'info',
      location: {
        path: a.path,
        lines: { begin: a.startLine },
      },
    }));
  }

  // ===========================================================================
  // API HELPERS
  // ===========================================================================

  private async apiGet<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.host}/api/v4${endpoint}`, {
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private async apiPost<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${this.host}/api/v4${endpoint}`, {
      method: 'POST',
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  private async apiPut(endpoint: string, body: Record<string, unknown>): Promise<void> {
    const response = await fetch(`${this.host}/api/v4${endpoint}`, {
      method: 'PUT',
      headers: {
        'PRIVATE-TOKEN': this.token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }
  }
}

export function createGitLabProvider(config: GitLabProviderConfig): GitLabProvider {
  return new GitLabProvider(config);
}
