import { vi, describe, it, expect, beforeEach } from 'vitest'
import { exec } from 'child_process'
import { execShell } from '../shell.js'

vi.mock('child_process', () => ({
  exec: vi.fn()
}))

type ExecCallback = (
  error: (Error & { code?: number }) | null,
  stdout: string,
  stderr: string
) => void
type ExecImpl = (command: string, opts: object, cb: ExecCallback) => void

const mockExec = vi.mocked(exec)

function stubExec(error: (Error & { code?: number }) | null, stdout: string, stderr: string): void {
  mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
    cb(error, stdout, stderr)
  }) as ExecImpl as typeof exec)
}

describe('execShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves with exitCode 0 when exec succeeds', async () => {
    stubExec(null, 'stdout text', 'stderr text')

    const result = await execShell('echo hello', '/tmp')

    expect(result.exitCode).toBe(0)
  })

  it('resolves with stdout from the exec callback', async () => {
    stubExec(null, 'hello stdout', '')

    const result = await execShell('echo hello', '/tmp')

    expect(result.stdout).toBe('hello stdout')
  })

  it('resolves with stderr from the exec callback', async () => {
    stubExec(null, '', 'hello stderr')

    const result = await execShell('echo hello', '/tmp')

    expect(result.stderr).toBe('hello stderr')
  })

  it('resolves with error.code as exitCode when exec errors with a code', async () => {
    stubExec(Object.assign(new Error('command failed'), { code: 127 }), '', 'command not found')

    const result = await execShell('bad-cmd', '/tmp')

    expect(result.exitCode).toBe(127)
  })

  it('resolves with exitCode 0 when error exists but code is undefined', async () => {
    stubExec(new Error('no exit code') as Error & { code?: number }, '', '')

    const result = await execShell('bad-cmd', '/tmp')

    expect(result.exitCode).toBe(0)
  })

  it('resolves with stdout even when exec errors', async () => {
    stubExec(Object.assign(new Error('partial failure'), { code: 1 }), 'partial output', '')

    const result = await execShell('partial-cmd', '/tmp')

    expect(result.stdout).toBe('partial output')
  })

  it('resolves with stderr even when exec errors', async () => {
    stubExec(Object.assign(new Error('command failed'), { code: 1 }), '', 'error diagnostics')

    const result = await execShell('bad-cmd', '/tmp')

    expect(result.stderr).toBe('error diagnostics')
  })

  it('passes the command string to exec', async () => {
    stubExec(null, '', '')

    await execShell('ls -la', '/tmp')

    expect(mockExec).toHaveBeenCalledWith('ls -la', expect.any(Object), expect.any(Function))
  })

  it('passes the cwd option to exec', async () => {
    stubExec(null, '', '')

    await execShell('ls', '/home/user')

    expect(mockExec).toHaveBeenCalledWith(
      expect.any(String),
      { cwd: '/home/user' },
      expect.any(Function)
    )
  })
})
