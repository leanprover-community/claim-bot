import { expiryEnabled } from '../config.js'
import { resolveExpiry, toStorage, formatExpiry } from '../ttl.js'
import { getIssueItem, setStatus, setExpiry } from '../github/projects.js'
import {
  getAssignees, assign, unassign, comment, getCollaboratorPermission, canBeAssigned,
} from '../github/issues.js'
import { type Deps, optionId, requireOption, isTerminal } from './deps.js'
import { writeNote } from './note.js'

/** Permission levels that may register others on a task: write or above (incl. triage/maintain). */
function canAssign(perm: { permission: string; roleName: string | null }): boolean {
  if (perm.permission === 'admin' || perm.permission === 'write') return true
  // The legacy `permission` field collapses triage→read, so consult the granular role for triage.
  return perm.roleName === 'triage' || perm.roleName === 'maintain'
}

/**
 * Handle `assign @target [expiry]` plus an optional freeform note.
 *
 * Unlike `claim` (egalitarian self-service), `assign` is an act of authority: only a write/triage
 * collaborator may register someone else, and it overrides an existing claim (the main reason to
 * assign is handing off abandoned or misallocated work). The board lifecycle, TTL, and note all
 * carry over from `claim` unchanged. Writes are ordered fail-closed: expiry, then status, then the
 * assignee swap, so the sweep never sees a Claimed item with a missing expiry.
 */
export async function handleAssign(deps: Deps, target: string, expiryArg: string, note: string): Promise<void> {
  const { octokit, repoOctokit, cfg, ctx, owner, repo, issueNumber, actor } = deps
  const now = new Date()

  // ---- Authority gate ------------------------------------------------------
  const perm = await getCollaboratorPermission(repoOctokit, owner, repo, actor)
  if (!canAssign(perm)) {
    await comment(repoOctokit, owner, repo, issueNumber,
      `@${actor} only collaborators with write or triage access can register someone else on a task. You can \`claim\` it for yourself instead.`)
    return
  }

  const item = await getIssueItem(octokit, owner, repo, issueNumber, ctx)
  if (!item) {
    await comment(repoOctokit, owner, repo, issueNumber,
      `@${actor} this issue isn't on the **${cfg.projectTitle}** board yet, so it can't be assigned. A maintainer needs to add it first.`)
    return
  }

  // Validate the target before touching the board, so a bad name can't leave the card flipped to
  // Claimed with nobody assigned (addAssignees silently ignores users it can't assign).
  if (!(await canBeAssigned(repoOctokit, owner, repo, target))) {
    await comment(repoOctokit, owner, repo, issueNumber,
      `@${actor} @${target} can't be assigned to issues in ${owner}/${repo} — they need read access or org membership first.`)
    return
  }

  const assignees = await getAssignees(repoOctokit, owner, repo, issueNumber)
  const statusName = item.statusOptionId ? ctx.statusNameById.get(item.statusOptionId) ?? null : null
  const claimedId = requireOption(ctx, cfg.statusClaimed)
  const inProgressId = optionId(ctx, cfg.statusInProgress)
  const targetHolds =
    assignees.some((a) => a.toLowerCase() === target.toLowerCase()) &&
    (item.statusOptionId === claimedId || (inProgressId !== null && item.statusOptionId === inProgressId))

  // Terminal statuses (In Review / Completed) are recognized but not managed, same as `claim`.
  if (isTerminal(cfg, statusName)) {
    await comment(repoOctokit, owner, repo, issueNumber,
      `@${actor} this task is **${statusName}**, so there's nothing to assign.`)
    return
  }

  // ---- Expiry disabled: behave like the classic TTL-less bot ---------------
  if (!expiryEnabled(cfg)) {
    if (!targetHolds) await reassign(deps, assignees, target)
    await setStatus(octokit, ctx, item.itemId, claimedId)
    await writeNote(deps, item.itemId, note, !targetHolds)
    const suffix = expiryArg.trim() ? ' (expiry ignored: this project doesn\'t track claim expiry)' : ''
    await comment(repoOctokit, owner, repo, issueNumber,
      `@${target}, @${actor} has registered you as working on this task.${suffix}`)
    return
  }

  const res = resolveExpiry(expiryArg, now, cfg.defaultTtl, cfg.maxTtlMs)
  if (!res.ok) {
    await comment(repoOctokit, owner, repo, issueNumber, `@${actor} ${res.reason}`)
    return
  }

  // Fail-closed order: expiry before status, then the assignee swap, then the note + comment.
  await setExpiry(octokit, ctx, item.itemId, toStorage(res.expiry))
  await setStatus(octokit, ctx, item.itemId, claimedId)
  if (!targetHolds) await reassign(deps, assignees, target)
  await writeNote(deps, item.itemId, note, !targetHolds)

  const verb = targetHolds ? 'refreshed your registration on' : 'registered you as working on'
  await comment(repoOctokit, owner, repo, issueNumber,
    `@${target}, @${actor} has ${verb} this task. This registration expires **${formatExpiry(res.expiry)}**.`)
}

/** Make `target` the sole assignee: add them, then remove every prior assignee (override/handoff). */
async function reassign(deps: Deps, assignees: string[], target: string): Promise<void> {
  const { repoOctokit, owner, repo, issueNumber } = deps
  await assign(repoOctokit, owner, repo, issueNumber, target)
  for (const a of assignees) {
    if (a.toLowerCase() !== target.toLowerCase()) await unassign(repoOctokit, owner, repo, issueNumber, a)
  }
}
