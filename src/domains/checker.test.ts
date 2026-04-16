import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CheckerDomain } from '@src/domains/checker'
import type { ICheckerRepository } from '@src/repositories/ports/checker'
import type { CommandResult } from '@src/types/checker'

// ─── helpers ────────────────────────────────────────────────────────────────

function passingResult(overrides?: Partial<CommandResult>): CommandResult {
  return { errors: [], warnings: [], exitCode: 0, ...overrides }
}

function failingResult(overrides?: Partial<CommandResult>): CommandResult {
  return { errors: ['error'], warnings: [], exitCode: 1, ...overrides }
}

function makeMockRepo(
  partials?: Partial<{
    findProjectRoot: () => string
    runLint: ICheckerRepository['runLint']
    runBuild: ICheckerRepository['runBuild']
    runTest: ICheckerRepository['runTest']
  }>
): ICheckerRepository {
  return {
    findProjectRoot: vi.fn(() => '/auto/root'),
    runLint: vi.fn(() => passingResult()),
    runBuild: vi.fn(() => passingResult()),
    runTest: vi.fn(() => passingResult()),
    ...partials
  }
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('CheckerDomain.check', () => {
  let repo: ICheckerRepository
  let domain: CheckerDomain

  beforeEach(() => {
    repo = makeMockRepo()
    domain = new CheckerDomain(repo)
  })

  // ── happy path ─────────────────────────────────────────────────────────────

  it('returns ok=true and all results when all commands pass', () => {
    const lintRes = passingResult({ warnings: ['w'] })
    const buildRes = passingResult()
    const testRes = passingResult()
    repo.runLint = vi.fn(() => lintRes)
    repo.runBuild = vi.fn(() => buildRes)
    repo.runTest = vi.fn(() => testRes)

    const result = domain.check({ projectRoot: '/my/root' })

    expect(result.ok).toBe(true)
    expect(result.lint).toBe(lintRes)
    expect(result.build).toBe(buildRes)
    expect(result.test).toBe(testRes)
  })

  // ── projectRoot branch ─────────────────────────────────────────────────────

  it('uses the provided projectRoot as cwd for all repo calls', () => {
    domain.check({ projectRoot: '/explicit/root', lintCommand: 'lint-cmd' })

    expect(repo.runLint).toHaveBeenCalledWith('/explicit/root', 'lint-cmd')
    expect(repo.runBuild).toHaveBeenCalledWith('/explicit/root', undefined)
    expect(repo.runTest).toHaveBeenCalledWith('/explicit/root', undefined)
    expect(repo.findProjectRoot).not.toHaveBeenCalled()
  })

  it('falls back to findProjectRoot() when projectRoot is not provided', () => {
    domain.check({})

    expect(repo.findProjectRoot).toHaveBeenCalledOnce()
    expect(repo.runLint).toHaveBeenCalledWith('/auto/root', undefined)
    expect(repo.runBuild).toHaveBeenCalledWith('/auto/root', undefined)
    expect(repo.runTest).toHaveBeenCalledWith('/auto/root', undefined)
  })

  // ── ok=false branches ──────────────────────────────────────────────────────

  it('returns ok=false when lint fails', () => {
    repo.runLint = vi.fn(() => failingResult())

    const result = domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
    expect(result.lint.exitCode).toBe(1)
  })

  it('returns ok=false when build fails', () => {
    repo.runBuild = vi.fn(() => failingResult())

    const result = domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
    expect(result.build.exitCode).toBe(1)
  })

  it('returns ok=false when test fails', () => {
    repo.runTest = vi.fn(() => failingResult())

    const result = domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
    expect(result.test.exitCode).toBe(1)
  })

  it('returns ok=false when multiple commands fail', () => {
    repo.runLint = vi.fn(() => failingResult())
    repo.runBuild = vi.fn(() => failingResult())

    const result = domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
  })

  // ── optional command forwarding ────────────────────────────────────────────

  it('forwards custom command strings to each repo method', () => {
    domain.check({
      projectRoot: '/root',
      lintCommand: 'my-lint',
      buildCommand: 'my-build',
      testCommand: 'my-test'
    })

    expect(repo.runLint).toHaveBeenCalledWith('/root', 'my-lint')
    expect(repo.runBuild).toHaveBeenCalledWith('/root', 'my-build')
    expect(repo.runTest).toHaveBeenCalledWith('/root', 'my-test')
  })
})
