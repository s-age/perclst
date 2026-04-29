import { vi, describe, it, expect, beforeEach } from 'vitest'
import { exec } from 'child_process'
import { ShellInfra } from '../shell'

vi.mock('child_process', () => ({
  exec: vi.fn()
}))

type ExecCallback = (
  error: (Error & { code?: number }) | null,
  stdout: string,
  stderr: string
) => void
type ExecImpl = (command: string, opts: object, cb: ExecCallback) => void

describe('ShellInfra', () => {
  let infra: ShellInfra

  beforeEach(() => {
    vi.clearAllMocks()
    infra = new ShellInfra()
  })

  it('should return exitCode 0 on successful execution', async () => {
    vi.mocked(exec).mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback): void => {
      cb(null, 'output', '')
    }) as unknown as ExecImpl as typeof exec)

    const result = await infra.execShell('echo hello', '/tmp')

    expect(result.exitCode).toBe(0)
  })

  it('should return stdout from successful execution', async () => {
    vi.mocked(exec).mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback): void => {
      cb(null, 'Success output', '')
    }) as unknown as ExecImpl as typeof exec)

    const result = await infra.execShell('echo hello', '/tmp')

    expect(result.stdout).toBe('Success output')
  })

  it('should return stderr from successful execution', async () => {
    vi.mocked(exec).mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback): void => {
      cb(null, 'output', 'warning')
    }) as unknown as ExecImpl as typeof exec)

    const result = await infra.execShell('npm run build', '/home/user')

    expect(result.stderr).toBe('warning')
  })

  it('should return error exit code when command fails', async () => {
    const error = Object.assign(new Error('fail'), { code: 127 })
    vi.mocked(exec).mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback): void => {
      cb(error, '', 'command not found')
    }) as unknown as ExecImpl as typeof exec)

    const result = await infra.execShell('invalid-cmd', '/tmp')

    expect(result.exitCode).toBe(127)
  })

  it('should default exitCode to 0 when error has no code', async () => {
    const error = new Error('fail') as Error & { code?: number }
    vi.mocked(exec).mockImplementation(((_cmd: string, _opts: object, cb: ExecCallback): void => {
      cb(error, '', 'error')
    }) as unknown as ExecImpl as typeof exec)

    const result = await infra.execShell('bad-cmd', '/tmp')

    expect(result.exitCode).toBe(0)
  })
})
