import type { getOctokit } from '@actions/github'

type Octokit = ReturnType<typeof getOctokit>

export async function getAssignees(octokit: Octokit, owner: string, repo: string, issue_number: number): Promise<string[]> {
  const res = await octokit.rest.issues.get({ owner, repo, issue_number })
  return (res.data.assignees ?? []).map((a) => a.login)
}

export async function assign(octokit: Octokit, owner: string, repo: string, issue_number: number, login: string): Promise<void> {
  await octokit.rest.issues.addAssignees({ owner, repo, issue_number, assignees: [login] })
}

export async function unassign(octokit: Octokit, owner: string, repo: string, issue_number: number, login: string): Promise<void> {
  await octokit.rest.issues.removeAssignees({ owner, repo, issue_number, assignees: [login] })
}

export async function comment(octokit: Octokit, owner: string, repo: string, issue_number: number, body: string): Promise<void> {
  await octokit.rest.issues.createComment({ owner, repo, issue_number, body })
}

export interface PullState {
  state: 'open' | 'closed'
  merged: boolean
  baseRepoFullName: string
  body: string
}

/** Fetch a PR's state for `propose` validation; null if it doesn't exist. */
export async function getPull(octokit: Octokit, owner: string, repo: string, pull_number: number): Promise<PullState | null> {
  try {
    const res = await octokit.rest.pulls.get({ owner, repo, pull_number })
    return {
      state: res.data.state as 'open' | 'closed',
      merged: res.data.merged,
      baseRepoFullName: res.data.base.repo.full_name,
      body: res.data.body ?? '',
    }
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null
    throw err
  }
}

/** Append "Closes #N" to a PR body if absent. */
export async function linkPullToIssue(octokit: Octokit, owner: string, repo: string, pull_number: number, issueNumber: number, body: string): Promise<void> {
  const marker = `Closes #${issueNumber}`
  if (new RegExp(`closes #${issueNumber}\\b`, 'i').test(body)) return
  const next = `${body.replace(/\s+$/, '')}\n\n${marker}`.replace(/^\n+/, '')
  await octokit.rest.pulls.update({ owner, repo, pull_number, body: next })
}

/** Remove a "Closes #N" line from a PR body if present. */
export async function unlinkPullFromIssue(octokit: Octokit, owner: string, repo: string, pull_number: number, issueNumber: number, body: string): Promise<void> {
  const next = body.replace(new RegExp(`\\n*closes #${issueNumber}\\b[^\\n]*`, 'i'), '').replace(/\s+$/, '')
  if (next === body.replace(/\s+$/, '')) return
  await octokit.rest.pulls.update({ owner, repo, pull_number, body: next })
}
