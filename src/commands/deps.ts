import type { getOctokit } from '@actions/github'
import type { Config } from '../config.js'
import type { ProjectContext } from '../github/projects.js'

type Octokit = ReturnType<typeof getOctokit>

export interface Deps {
  /** Client on the project token — Projects v2 GraphQL writes. */
  octokit: Octokit
  /** Client on repo-token (the workflow GITHUB_TOKEN) — Issue/PR REST + repo-level GraphQL. */
  repoOctokit: Octokit
  cfg: Config
  ctx: ProjectContext
  owner: string
  repo: string
  issueNumber: number
  /** login of the comment author driving this command */
  actor: string
}

export function optionId(ctx: ProjectContext, name: string): string | null {
  return ctx.statusOptionIdByName.get(name.toLowerCase()) ?? null
}

export function requireOption(ctx: ProjectContext, name: string): string {
  const id = optionId(ctx, name)
  if (!id) throw new Error(`Project status field has no option named ${JSON.stringify(name)}.`)
  return id
}

export function isTerminal(cfg: Config, statusName: string | null): boolean {
  if (!statusName) return false
  return cfg.terminalStatuses.some((s) => s.toLowerCase() === statusName.toLowerCase())
}
