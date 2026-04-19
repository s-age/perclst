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

  it('should return stdout, stderr, and exitCode 0 on successful command execution', async () => {
    mocks.execAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    })

    const result = await commandRunner.runCommand('echo hello', '/tmp')

    expect(result).toEqual<RawCommandOutput>({
      stdout: 'Success output',
      stderr: '',
      exitCode: 0
    })
  })

  it('should return exitCode 0 when command succeeds with both stdout and stderr', async () => {
    mocks.execAsync.mockResolvedValueOnce({
      stdout: 'output',
      stderr: 'warning'
    })

    const result = await commandRunner.runCommand('npm run build', '/home/user')

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toBe('output')
    expect(result.stderr).toBe('warning')
  })

  it('should handle error with all error properties present', async () => {
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

  it('should use empty string for stdout when error object lacks stdout property', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stderr: 'error occurred',
      code: 1
    })

    const result = await commandRunner.runCommand('bad-command', '/tmp')

    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('error occurred')
    expect(result.exitCode).toBe(1)
  })

  it('should use empty string for stderr when error object lacks stderr property', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: 'some output',
      code: 2
    })

    const result = await commandRunner.runCommand('another-bad-command', '/tmp')

    expect(result.stdout).toBe('some output')
    expect(result.stderr).toBe('')
    expect(result.exitCode).toBe(2)
  })

  it('should default exit code to 1 when error object lacks code property', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: 'output',
      stderr: 'error'
    })

    const result = await commandRunner.runCommand('cmd', '/tmp')

    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('output')
    expect(result.stderr).toBe('error')
  })

  it('should handle error object with all properties missing', async () => {
    mocks.execAsync.mockRejectedValueOnce({})

    const result = await commandRunner.runCommand('test-cmd', '/tmp')

    expect(result).toEqual<RawCommandOutput>({
      stdout: '',
      stderr: '',
      exitCode: 1
    })
  })

  it('should pass command and cwd options to execAsync', async () => {
    mocks.execAsync.mockResolvedValueOnce({
      stdout: 'done',
      stderr: ''
    })

    await commandRunner.runCommand('ls', '/home/user/project')

    expect(mocks.execAsync).toHaveBeenCalledWith('ls', {
      cwd: '/home/user/project',
      encoding: 'utf-8'
    })
  })

  it('should preserve non-zero exit codes from failed commands', async () => {
    mocks.execAsync.mockRejectedValueOnce({
      stdout: '',
      stderr: 'Command failed',
      code: 2
    })

    const result = await commandRunner.runCommand('npm test', '/tmp')

    expect(result.exitCode).toBe(2)
  })
})
