import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { RawCommandOutput } from '@src/types/checker'

// Use vi.hoisted to create mocks that can be referenced in vi.mock
const { mocks } = vi.hoisted(() => ({
  mocks: {
    execAsync: vi.fn()
  }
}))

// Mock util.promisify to return our mock function
vi.mock('util', () => ({
  promisify: vi.fn(() => mocks.execAsync)
}))

// Mock child_process.exec (not actually used since promisify returns our mock)
vi.mock('child_process', () => ({
  exec: vi.fn()
}))

import * as commandRunner from '../commandRunner.js'

describe('runCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Happy path ──────────────────────────────────────────────────────────────

  it('should return exitCode 0 on successful execution', async () => {
    mocks.execAsync.mockResolvedValueOnce({ stdout: 'Success output', stderr: '' })

    const result = await commandRunner.runCommand('echo hello', '/tmp')

    expect(result.exitCode).toBe(0)
  })

  it('should return stdout from successful execution', async () => {
    mocks.execAsync.mockResolvedValueOnce({ stdout: 'Success output', stderr: '' })

    const result = await commandRunner.runCommand('echo hello', '/tmp')

    expect(result.stdout).toBe('Success output')
  })

  it('should return stderr from successful execution', async () => {
    mocks.execAsync.mockResolvedValueOnce({ stdout: 'output', stderr: 'warning' })

    const result = await commandRunner.runCommand('npm run build', '/home/user')

    expect(result.stderr).toBe('warning')
  })

  it('should pass command to execAsync', async () => {
    mocks.execAsync.mockResolvedValueOnce({ stdout: 'done', stderr: '' })

    await commandRunner.runCommand('ls', '/home/user/project')

    expect(mocks.execAsync).toHaveBeenCalledWith('ls', expect.any(Object))
  })

  it('should pass cwd option to execAsync', async () => {
    mocks.execAsync.mockResolvedValueOnce({ stdout: 'done', stderr: '' })

    await commandRunner.runCommand('ls', '/home/user/project')

    expect(mocks.execAsync).toHaveBeenCalledWith(expect.any(String), {
      cwd: '/home/user/project',
      encoding: 'utf-8'
    })
  })

  it('should pass encoding utf-8 to execAsync', async () => {
    mocks.execAsync.mockResolvedValueOnce({ stdout: 'done', stderr: '' })

    await commandRunner.runCommand('ls', '/tmp')

    expect(mocks.execAsync).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ encoding: 'utf-8' })
    )
  })

  // ── Error path: full error object ───────────────────────────────────────────

  it('should return stdout from error object when command fails', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: 'partial output',
      stderr: 'error message',
      code: 127
    })

    const result = await commandRunner.runCommand('invalid-command', '/tmp')

    expect(result.stdout).toBe('partial output')
  })

  it('should return stderr from error object when command fails', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: 'partial output',
      stderr: 'error message',
      code: 127
    })

    const result = await commandRunner.runCommand('invalid-command', '/tmp')

    expect(result.stderr).toBe('error message')
  })

  it('should return exit code from error object when command fails', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: 'partial output',
      stderr: 'error message',
      code: 127
    })

    const result = await commandRunner.runCommand('invalid-command', '/tmp')

    expect(result.exitCode).toBe(127)
  })

  it('should return the full RawCommandOutput shape on error', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: 'partial output',
      stderr: 'error message',
      code: 127
    })

    const result = await commandRunner.runCommand('invalid-command', '/tmp')

    expect(result).toEqual<RawCommandOutput>({
      stdout: 'partial output',
      stderr: 'error message',
      exitCode: 127
    })
  })

  // ── Error path: missing stdout ───────────────────────────────────────────────

  it('should default stdout to empty string when error object lacks stdout', async () => {
    mocks.execAsync.mockRejectedValueOnce({ stderr: 'error occurred', code: 1 })

    const result = await commandRunner.runCommand('bad-command', '/tmp')

    expect(result.stdout).toBe('')
  })

  // ── Error path: missing stderr ───────────────────────────────────────────────

  it('should default stderr to empty string when error object lacks stderr', async () => {
    mocks.execAsync.mockRejectedValueOnce({ stdout: 'some output', code: 2 })

    const result = await commandRunner.runCommand('another-bad-command', '/tmp')

    expect(result.stderr).toBe('')
  })

  // ── Error path: missing code ─────────────────────────────────────────────────

  it('should default exitCode to 1 when error object lacks code', async () => {
    mocks.execAsync.mockRejectedValueOnce({ stdout: 'output', stderr: 'error' })

    const result = await commandRunner.runCommand('cmd', '/tmp')

    expect(result.exitCode).toBe(1)
  })

  // ── Error path: completely empty error object ────────────────────────────────

  it('should default all fields when error object is empty', async () => {
    mocks.execAsync.mockRejectedValueOnce({})

    const result = await commandRunner.runCommand('test-cmd', '/tmp')

    expect(result).toEqual<RawCommandOutput>({ stdout: '', stderr: '', exitCode: 1 })
  })

  // ── Error path: non-zero exit codes preserved ────────────────────────────────

  it('should preserve exit code 2 from failed command', async () => {
    mocks.execAsync.mockRejectedValueOnce({ stdout: '', stderr: 'Command failed', code: 2 })

    const result = await commandRunner.runCommand('npm test', '/tmp')

    expect(result.exitCode).toBe(2)
  })
})
