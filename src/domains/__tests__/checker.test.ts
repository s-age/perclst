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
    runLint: vi.fn(() => Promise.resolve(passingResult())),
    runBuild: vi.fn(() => Promise.resolve(passingResult())),
    runTest: vi.fn(() => Promise.resolve(passingResult())),
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

  it('returns ok=true and all results when all commands pass', async () => {
    const lintRes = passingResult({ warnings: ['w'] })
    const buildRes = passingResult()
    const testRes = passingResult()
    repo.runLint = vi.fn(() => Promise.resolve(lintRes))
    repo.runBuild = vi.fn(() => Promise.resolve(buildRes))
    repo.runTest = vi.fn(() => Promise.resolve(testRes))

    const result = await domain.check({ projectRoot: '/my/root' })

    expect(result.ok).toBe(true)
    expect(result.lint).toBe(lintRes)
    expect(result.build).toBe(buildRes)
    expect(result.test).toBe(testRes)
  })

  // ── projectRoot branch ─────────────────────────────────────────────────────

  it('uses the provided projectRoot as cwd for all repo calls', async () => {
    await domain.check({ projectRoot: '/explicit/root', lintCommand: 'lint-cmd' })

    expect(repo.runLint).toHaveBeenCalledWith('/explicit/root', 'lint-cmd')
    expect(repo.runBuild).toHaveBeenCalledWith('/explicit/root', undefined)
    expect(repo.runTest).toHaveBeenCalledWith('/explicit/root', undefined)
    expect(repo.findProjectRoot).not.toHaveBeenCalled()
  })

  it('falls back to findProjectRoot() when projectRoot is not provided', async () => {
    await domain.check({})

    expect(repo.findProjectRoot).toHaveBeenCalledOnce()
    expect(repo.runLint).toHaveBeenCalledWith('/auto/root', undefined)
    expect(repo.runBuild).toHaveBeenCalledWith('/auto/root', undefined)
    expect(repo.runTest).toHaveBeenCalledWith('/auto/root', undefined)
  })

  // ── ok=false branches ──────────────────────────────────────────────────────

  it('returns ok=false when lint fails', async () => {
    repo.runLint = vi.fn(() => Promise.resolve(failingResult()))

    const result = await domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
    expect(result.lint.exitCode).toBe(1)
  })

  it('returns ok=false when build fails', async () => {
    repo.runBuild = vi.fn(() => Promise.resolve(failingResult()))

    const result = await domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
    expect(result.build.exitCode).toBe(1)
  })

  it('returns ok=false when test fails', async () => {
    repo.runTest = vi.fn(() => Promise.resolve(failingResult()))

    const result = await domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
    expect(result.test.exitCode).toBe(1)
  })

  it('returns ok=false when multiple commands fail', async () => {
    repo.runLint = vi.fn(() => Promise.resolve(failingResult()))
    repo.runBuild = vi.fn(() => Promise.resolve(failingResult()))

    const result = await domain.check({ projectRoot: '/root' })

    expect(result.ok).toBe(false)
  })

  // ── optional command forwarding ────────────────────────────────────────────

  it('forwards custom command strings to each repo method', async () => {
    await domain.check({
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
