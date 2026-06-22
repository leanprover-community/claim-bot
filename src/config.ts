import * as core from '@actions/core'
import { parseTtlSetting, type TtlSetting } from './ttl.js'

export type Mode = 'command' | 'sweep'
export type BackfillMode = 'grace' | 'ignore' | 'expire'

export interface Config {
  mode: Mode
  token: string
  projectTitle: string
  statusField: string
  statusUnclaimed: string
  statusClaimed: string
  statusInProgress: string
  terminalStatuses: string[]
  expiryField: string
  defaultTtl: TtlSetting
  maxTtlMs: number | null
  expireInProgress: boolean
  backfillLegacy: BackfillMode
}

/** True when the project has turned expiry off entirely (default-ttl: none). */
export function expiryEnabled(cfg: Config): boolean {
  return !cfg.defaultTtl.disabled
}

function parseMode(raw: string): Mode {
  if (raw === 'command' || raw === 'sweep') return raw
  throw new Error(`Invalid mode ${JSON.stringify(raw)}; expected "command" or "sweep".`)
}

function parseBackfill(raw: string): BackfillMode {
  if (raw === 'grace' || raw === 'ignore' || raw === 'expire') return raw
  throw new Error(`Invalid backfill-legacy ${JSON.stringify(raw)}; expected "grace", "ignore", or "expire".`)
}

export function readConfig(): Config {
  const defaultTtl = parseTtlSetting(core.getInput('default-ttl') || '30d')
  const maxTtl = parseTtlSetting(core.getInput('max-ttl') || '90d')

  return {
    mode: parseMode(core.getInput('mode', { required: true })),
    token: core.getInput('project-token', { required: true }),
    projectTitle: core.getInput('project-title', { required: true }),
    statusField: core.getInput('status-field') || 'Status',
    statusUnclaimed: core.getInput('status-unclaimed') || 'Unclaimed',
    statusClaimed: core.getInput('status-claimed') || 'Claimed',
    statusInProgress: core.getInput('status-in-progress') || 'In Progress',
    terminalStatuses: (core.getInput('terminal-statuses') || 'In Review,Completed')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    expiryField: core.getInput('expiry-field') || 'Claim Expires',
    defaultTtl,
    maxTtlMs: maxTtl.disabled ? null : maxTtl.ms,
    expireInProgress: core.getBooleanInput('expire-in-progress'),
    backfillLegacy: parseBackfill(core.getInput('backfill-legacy') || 'grace'),
  }
}
