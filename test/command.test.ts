import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCommand } from '../src/command.js'

test('claim: bare and with whitespace/case', () => {
  assert.deepEqual(parseCommand('claim'), { kind: 'claim', expiryArg: '' })
  assert.deepEqual(parseCommand('  CLAIM\n'), { kind: 'claim', expiryArg: '' })
})

test('claim: with expiry argument', () => {
  assert.deepEqual(parseCommand('claim 1h'), { kind: 'claim', expiryArg: '1h' })
  assert.deepEqual(parseCommand('claim 3 weeks'), { kind: 'claim', expiryArg: '3 weeks' })
  assert.deepEqual(parseCommand('claim until 2026-08-01'), { kind: 'claim', expiryArg: 'until 2026-08-01' })
})

test('disclaim is distinguished from claim', () => {
  assert.deepEqual(parseCommand('disclaim'), { kind: 'disclaim' })
  // "disclaim" must not be read as a claim with arg
  assert.notDeepEqual(parseCommand('disclaim'), { kind: 'claim', expiryArg: '' })
})

test('reclaim is not a command (anchored)', () => {
  assert.equal(parseCommand('reclaim'), null)
})

test('propose: various PR spellings', () => {
  assert.deepEqual(parseCommand('propose #12'), { kind: 'propose', pr: 12 })
  assert.deepEqual(parseCommand('propose pr #12'), { kind: 'propose', pr: 12 })
  assert.deepEqual(parseCommand('PROPOSE PR#12'), { kind: 'propose', pr: 12 })
  assert.deepEqual(parseCommand('propose#12'), { kind: 'propose', pr: 12 })
})

test('withdraw: various PR spellings', () => {
  assert.deepEqual(parseCommand('withdraw #7'), { kind: 'withdraw', pr: 7 })
  assert.deepEqual(parseCommand('withdraw pr #7'), { kind: 'withdraw', pr: 7 })
})

test('prose containing keywords does not trigger', () => {
  assert.equal(parseCommand("I'll claim this later"), null)
  assert.equal(parseCommand('can someone propose a PR for this?'), null)
  assert.equal(parseCommand('propose 12'), null) // missing #
  assert.equal(parseCommand('thanks!'), null)
})
