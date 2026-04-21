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

describe('execShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves with exitCode 0 when exec succeeds', async () => {
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(null, 'stdout text', 'stderr text')
    }) as ExecImpl as typeof exec)

    const result = await execShell('echo hello', '/tmp')

    expect(result.exitCode).toBe(0)
  })

  it('resolves with stdout from the exec callback', async () => {
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(null, 'hello stdout', '')
    }) as ExecImpl as typeof exec)

    const result = await execShell('echo hello', '/tmp')

    expect(result.stdout).toBe('hello stdout')
  })

  it('resolves with stderr from the exec callback', async () => {
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(null, '', 'hello stderr')
    }) as ExecImpl as typeof exec)

    const result = await execShell('echo hello', '/tmp')

    expect(result.stderr).toBe('hello stderr')
  })

  it('resolves with error.code as exitCode when exec errors with a code', async () => {
    const error = Object.assign(new Error('command failed'), { code: 127 })
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(error, '', 'command not found')
    }) as ExecImpl as typeof exec)

    const result = await execShell('bad-cmd', '/tmp')

    expect(result.exitCode).toBe(127)
  })

  it('resolves with exitCode 0 when error exists but code is undefined', async () => {
    const error = new Error('no exit code') as Error & { code?: number }
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(error, '', '')
    }) as ExecImpl as typeof exec)

    const result = await execShell('bad-cmd', '/tmp')

    expect(result.exitCode).toBe(0)
  })

  it('resolves with stdout even when exec errors', async () => {
    const error = Object.assign(new Error('partial failure'), { code: 1 })
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(error, 'partial output', '')
    }) as ExecImpl as typeof exec)

    const result = await execShell('partial-cmd', '/tmp')

    expect(result.stdout).toBe('partial output')
  })

  it('passes the command string to exec', async () => {
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(null, '', '')
    }) as ExecImpl as typeof exec)

    await execShell('ls -la', '/tmp')

    expect(mockExec).toHaveBeenCalledWith('ls -la', expect.any(Object), expect.any(Function))
  })

  it('passes the cwd option to exec', async () => {
    mockExec.mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback) => {
      cb(null, '', '')
    }) as ExecImpl as typeof exec)

    await execShell('ls', '/home/user')

    expect(mockExec).toHaveBeenCalledWith(
      expect.any(String),
      { cwd: '/home/user' },
      expect.any(Function)
    )
  })
})
