/**
 * Parse a single issue comment into an intentions command, or null if it isn't one.
 *
 * Matching is deliberately strict (the whole comment must be the command, modulo
 * whitespace/case) so that prose like "I'll claim this later" does not trigger the bot.
 * This mirrors the original bot's exact-match behavior, extended so `claim` accepts an
 * optional expiry argument.
 */

export type Command =
  | { kind: 'claim'; expiryArg: string }
  | { kind: 'disclaim' }
  | { kind: 'propose'; pr: number }
  | { kind: 'withdraw'; pr: number }

export function parseCommand(body: string): Command | null {
  const normalized = body.replace(/\s+/g, ' ').trim().toLowerCase()

  // Check disclaim before claim ("disclaim" contains "claim", but is anchored separately).
  if (normalized === 'disclaim') return { kind: 'disclaim' }

  const claim = normalized.match(/^claim(?:\s+(.*))?$/)
  if (claim) return { kind: 'claim', expiryArg: claim[1] ?? '' }

  const propose = normalized.match(/^propose\s*(?:pr\s*)?#(\d+)$/)
  if (propose) return { kind: 'propose', pr: Number(propose[1]) }

  const withdraw = normalized.match(/^withdraw\s*(?:pr\s*)?#(\d+)$/)
  if (withdraw) return { kind: 'withdraw', pr: Number(withdraw[1]) }

  return null
}
