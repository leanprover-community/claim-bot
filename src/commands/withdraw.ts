import { getIssueItem, setStatus } from '../github/projects.js'
import { getAssignees, getPull, unlinkPullFromIssue, comment } from '../github/issues.js'
import { type Deps, optionId, requireOption } from './deps.js'

/**
 * Handle `withdraw PR #N`: move an In Progress task back to Claimed and unlink the PR.
 * The claim (assignee + expiry) is left intact, matching the original bot.
 */
export async function handleWithdraw(deps: Deps, pr: number): Promise<void> {
  const { octokit, repoOctokit, cfg, ctx, owner, repo, issueNumber, actor } = deps

  const item = await getIssueItem(octokit, owner, repo, issueNumber, ctx)
  if (!item) return
  const assignees = await getAssignees(repoOctokit, owner, repo, issueNumber)
  if (!assignees.includes(actor)) {
    await comment(repoOctokit, owner, repo, issueNumber, `@${actor} only the current claimant can withdraw a PR for this task.`)
    return
  }

  const claimedId = requireOption(ctx, cfg.statusClaimed)
  const inProgressId = optionId(ctx, cfg.statusInProgress)
  if (inProgressId === null || item.statusOptionId !== inProgressId) {
    const name = item.statusOptionId ? ctx.statusNameById.get(item.statusOptionId) : 'unknown'
    await comment(repoOctokit, owner, repo, issueNumber, `@${actor} this task is **${name}**, not ${cfg.statusInProgress}; nothing to withdraw.`)
    return
  }

  const pull = await getPull(repoOctokit, owner, repo, pr)
  if (pull) await unlinkPullFromIssue(repoOctokit, owner, repo, pr, issueNumber, pull.body)
  await setStatus(octokit, ctx, item.itemId, claimedId)
  await comment(repoOctokit, owner, repo, issueNumber, `@${actor} withdrew PR #${pr}; task is back to **${cfg.statusClaimed}** and still yours.`)
}
