import { vi, describe, it, expect, beforeEach } from 'vitest'
import { CheckerRepository } from '../checkerRepository'
import type { CommandRunnerInfra } from '@src/infrastructures/commandRunner'
import type { ProjectRootInfra } from '@src/infrastructures/projectRoot'

describe('CheckerRepository', () => {
  let repo: CheckerRepository
  let mockRunner: CommandRunnerInfra
  let mockProjectRoot: ProjectRootInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mockRunner = {
      runCommand: vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    } as unknown as CommandRunnerInfra
    mockProjectRoot = {
      findProjectRoot: vi.fn()
    } as unknown as ProjectRootInfra
    repo = new CheckerRepository(mockRunner, mockProjectRoot)
  })

  describe('findProjectRoot', () => {
    it('returns the value from the infrastructure function', () => {
      vi.mocked(mockProjectRoot.findProjectRoot).mockReturnValue('/project/root')
      expect(repo.findProjectRoot()).toBe('/project/root')
    })
  })

  describe('runLint', () => {
    it('uses the default lint command when none is provided', async () => {
      await repo.runLint('/cwd')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm run lint:fix', '/cwd')
    })

    it('uses the provided command when one is given', async () => {
      await repo.runLint('/cwd', 'eslint .')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('eslint .', '/cwd')
    })

    it('passes the cwd argument to runCommand', async () => {
      await repo.runLint('/my/project')
      expect(mockRunner.runCommand).toHaveBeenCalledWith(expect.any(String), '/my/project')
    })

    it('returns the exitCode from the parsed result', async () => {
      vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 1 })
      const result = await repo.runLint('/cwd')
      expect(result.exitCode).toBe(1)
    })
  })

  describe('runBuild', () => {
    it('uses the default build command when none is provided', async () => {
      await repo.runBuild('/cwd')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm run build', '/cwd')
    })

    it('uses the provided command when one is given', async () => {
      await repo.runBuild('/cwd', 'tsc --noEmit')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('tsc --noEmit', '/cwd')
    })

    it('passes the cwd argument to runCommand', async () => {
      await repo.runBuild('/my/project')
      expect(mockRunner.runCommand).toHaveBeenCalledWith(expect.any(String), '/my/project')
    })

    it('returns the exitCode from the parsed result', async () => {
      vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 2 })
      const result = await repo.runBuild('/cwd')
      expect(result.exitCode).toBe(2)
    })
  })

  describe('runTypecheck', () => {
    it('uses the default typecheck command when none is provided', async () => {
      await repo.runTypecheck('/cwd')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm run typecheck', '/cwd')
    })

    it('uses the provided command when one is given', async () => {
      await repo.runTypecheck('/cwd', 'tsc --noEmit')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('tsc --noEmit', '/cwd')
    })

    it('passes the cwd argument to runCommand', async () => {
      await repo.runTypecheck('/my/project')
      expect(mockRunner.runCommand).toHaveBeenCalledWith(expect.any(String), '/my/project')
    })

    it('returns the exitCode from the parsed result', async () => {
      vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 2 })
      const result = await repo.runTypecheck('/cwd')
      expect(result.exitCode).toBe(2)
    })
  })

  describe('runTest', () => {
    it('uses the default test command when none is provided', async () => {
      await repo.runTest('/cwd')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm run test:unit', '/cwd')
    })

    it('uses the provided command when one is given', async () => {
      await repo.runTest('/cwd', 'vitest run')
      expect(mockRunner.runCommand).toHaveBeenCalledWith('vitest run', '/cwd')
    })

    it('passes the cwd argument to runCommand', async () => {
      await repo.runTest('/my/project')
      expect(mockRunner.runCommand).toHaveBeenCalledWith(expect.any(String), '/my/project')
    })

    it('returns the exitCode from the parsed result', async () => {
      vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
      const result = await repo.runTest('/cwd')
      expect(result.exitCode).toBe(0)
    })
  })
})

describe('parseOutput (via runLint)', () => {
  let repo: CheckerRepository
  let mockRunner: CommandRunnerInfra

  beforeEach(() => {
    vi.clearAllMocks()
    mockRunner = {
      runCommand: vi.fn()
    } as unknown as CommandRunnerInfra
    repo = new CheckerRepository(mockRunner, {
      findProjectRoot: vi.fn()
    } as unknown as ProjectRootInfra)
  })

  it('returns an empty errors array when output contains no error lines', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: 'Build complete\nAll done',
      stderr: '',
      exitCode: 0
    })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toEqual([])
  })

  it('returns an empty warnings array when output contains no warning lines', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: 'Build complete',
      stderr: '',
      exitCode: 0
    })
    const result = await repo.runLint('/cwd')
    expect(result.warnings).toEqual([])
  })

  it('preserves the exitCode from the command result', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout: '', stderr: '', exitCode: 42 })
    const result = await repo.runLint('/cwd')
    expect(result.exitCode).toBe(42)
  })

  it('collects an error line that has no preceding file path', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: 'Unexpected error occurred',
      stderr: '',
      exitCode: 1
    })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toContain('Unexpected error occurred')
  })

  it('prefixes an error line with its immediately preceding file path', async () => {
    const stdout = '/src/foo.ts\nError: something bad'
    vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout, stderr: '', exitCode: 1 })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toContain('/src/foo.ts: Error: something bad')
  })

  it('collects a warning line that has no preceding file path', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: 'Deprecation warning found',
      stderr: '',
      exitCode: 0
    })
    const result = await repo.runLint('/cwd')
    expect(result.warnings).toContain('Deprecation warning found')
  })

  it('prefixes a warning line with its immediately preceding file path', async () => {
    const stdout = '/src/bar.tsx\nwarning: prefer const'
    vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout, stderr: '', exitCode: 0 })
    const result = await repo.runLint('/cwd')
    expect(result.warnings).toContain('/src/bar.tsx: warning: prefer const')
  })

  it.each([
    ['rollup', 'Rollup error in bundler'],
    ['throw new error', 'throw new Error("bad")'],
    ['requirewithfriendlyerror', 'requireWithFriendlyError failed']
  ] as const)('ignores error lines matching the "%s" noise pattern', async (_pattern, stdout) => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout, stderr: '', exitCode: 1 })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toEqual([])
  })

  it('ignores the ESLint problems summary line', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: '2 problems (1 error, 1 warning)',
      stderr: '',
      exitCode: 1
    })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toEqual([])
  })

  it('skips blank lines without adding them to errors or warnings', async () => {
    const stdout = '\n\nUnexpected error here\n\n'
    vi.mocked(mockRunner.runCommand).mockResolvedValue({ stdout, stderr: '', exitCode: 1 })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toHaveLength(1)
  })

  it('processes stderr lines the same as stdout lines', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: '',
      stderr: 'error from stderr',
      exitCode: 1
    })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toContain('error from stderr')
  })

  it('does not add a file-path-only line to errors or warnings', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: '/src/index.ts',
      stderr: '',
      exitCode: 0
    })
    const result = await repo.runLint('/cwd')
    expect(result.errors).toEqual([])
  })

  it('does not add a file-path-only line to warnings', async () => {
    vi.mocked(mockRunner.runCommand).mockResolvedValue({
      stdout: '/src/index.ts',
      stderr: '',
      exitCode: 0
    })
    const result = await repo.runLint('/cwd')
    expect(result.warnings).toEqual([])
  })
})
