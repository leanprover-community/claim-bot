# One-time board setup

The claim-bot drives a **GitHub Projects v2** board. You need two fields on it.

## 1. Status (single-select)

A single-select field (default name `Status`) with at least these options:

- `Unclaimed` — available to claim
- `Claimed` — someone holds it
- `In Progress` — a PR has been proposed
- (optional) `In Review`, `Completed` — terminal states the bot recognizes but doesn't manage

Option **names** are configurable via inputs (`status-unclaimed`, etc.) if yours differ.

## 2. Claim Expires (text)

A **Text** field named `Claim Expires`. The bot writes each claim's expiry here as an
ISO 8601 UTC datetime (e.g. `2026-08-01T14:00:00Z`); the sweep reads it. A Text field is
used (not a Date field) so hour-granularity TTLs are representable.

> If you set `default-ttl: none` (expiry disabled), you do **not** need this field, and you
> don't need the sweep workflow at all.

## 3. Tasks

Add issues to the board and set their `Status` to `Unclaimed`. Each such issue is claimable.

## 4. Token

Provide a secret `CLAIM_BOT_TOKEN` to the caller workflows. It must be able to read/write the
project and assign/comment on issues:

- **GitHub App (recommended for orgs):** install an App on the repo/org with
  `Projects: read & write`, `Issues: read & write`, `Pull requests: read & write`, and mint an
  installation token. Org App tokens avoid the SAML pitfalls of personal tokens.
- **Fine-grained PAT (simpler for personal repos):** scopes `Projects: read & write`,
  `Issues: read & write`, `Pull requests: read & write`. For an org with SAML SSO, the PAT
  must be SAML-authorized for that org.

The default `GITHUB_TOKEN` **cannot** write org-level Projects v2, which is why a separate
token is required.
