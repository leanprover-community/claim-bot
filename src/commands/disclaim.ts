import { getIssueItem, setStatus, clearExpiry } from '../github/projects.js'
import { getAssignees, unassign, comment } from '../github/issues.js'
import { type Deps, requireOption } from './deps.js'

/** Handle `disclaim`: release a claim you hold. Removes only the actor (claimant-only). */
export async function handleDisclaim(deps: Deps): Promise<void> {
  const { octokit, cfg, ctx, owner, repo, issueNumber, actor } = deps

  const item = await getIssueItem(octokit, owner, repo, issueNumber, ctx)
  if (!item) return // not on the board; nothing to do

  const assignees = await getAssignees(octokit, owner, repo, issueNumber)
  if (!assignees.includes(actor)) {
    await comment(octokit, owner, repo, issueNumber,
      `@${actor} you're not the current claimant of this task, so there's nothing to disclaim.`)
    return
  }

  const unclaimedId = requireOption(ctx, cfg.statusUnclaimed)
  await setStatus(octokit, ctx, item.itemId, unclaimedId)
  await clearExpiry(octokit, ctx, item.itemId)
  await unassign(octokit, owner, repo, issueNumber, actor)
  await comment(octokit, owner, repo, issueNumber,
    `@${actor} you've released this task — it's available again.`)
}
