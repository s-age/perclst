import type { IPermissionPipeRepository } from '@src/repositories/ports/permissionPipe'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe'
import type { FsInfra } from '@src/infrastructures/fs'
import type { TtyInfra } from '@src/infrastructures/ttyInfrastructure'
import { formatInputSummary } from '@src/utils/formatInputSummary'
import { join } from '@src/utils/path'

type PermissionPipeFs = Pick<
  FsInfra,
  'fileExists' | 'readText' | 'removeFileSync' | 'writeText' | 'tmpDir'
>

export class PermissionPipeRepository implements IPermissionPipeRepository {
  constructor(
    private fs: PermissionPipeFs,
    private tty: TtyInfra
  ) {}

  initPipePath(): void {
    process.env.PERCLST_PERMISSION_PIPE = join(this.fs.tmpDir(), `perclst-perm-${process.pid}`)
  }

  private get pipePath(): string | null {
    return process.env.PERCLST_PERMISSION_PIPE ?? null
  }

  pollRequest(): PermissionRequest | null {
    const p = this.pipePath
    if (!p) return null
    const reqPath = `${p}.req`
    if (!this.fs.fileExists(reqPath)) return null
    try {
      const req = JSON.parse(this.fs.readText(reqPath)) as PermissionRequest
      try {
        this.fs.removeFileSync(reqPath)
      } catch {
        /* ignore */
      }
      return req
    } catch {
      return null
    }
  }

  respond(result: PermissionResult): void {
    const p = this.pipePath
    if (!p) return
    try {
      this.fs.writeText(`${p}.res`, JSON.stringify(result))
    } catch {
      /* ignore */
    }
  }

  async askPermission(args: {
    tool_name: string
    input: Record<string, unknown>
    tool_use_id?: string
  }): Promise<PermissionResult> {
    if (process.env.PERCLST_PERMISSION_AUTO_YES === '1')
      return { behavior: 'allow', updatedInput: args.input }
    const pipePath = process.env.PERCLST_PERMISSION_PIPE
    if (pipePath) return this.askViaIPC(pipePath, args)
    return this.askViaTTY(args)
  }

  private async askViaIPC(
    pipePath: string,
    args: { tool_name: string; input: Record<string, unknown>; tool_use_id?: string }
  ): Promise<PermissionResult> {
    const reqPath = `${pipePath}.req`
    const resPath = `${pipePath}.res`
    this.fs.writeText(
      reqPath,
      JSON.stringify({
        tool_name: args.tool_name,
        input: args.input,
        tool_use_id: args.tool_use_id
      })
    )
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100))
      if (this.fs.fileExists(resPath)) {
        try {
          const res = JSON.parse(this.fs.readText(resPath)) as PermissionResult
          try {
            this.fs.removeFileSync(resPath)
          } catch {
            /* ignore */
          }
          return res
        } catch {
          return { behavior: 'deny', message: 'Failed to parse permission response' }
        }
      }
    }
    return { behavior: 'deny', message: 'Permission request timed out' }
  }

  private async askViaTTY(args: {
    tool_name: string
    input: Record<string, unknown>
  }): Promise<PermissionResult> {
    const summary = formatInputSummary(args.input)
    const prompt =
      `\nPermission Request\n` +
      `  Tool : ${args.tool_name}\n` +
      `  Input: ${summary.replace(/\n/g, '\n         ')}\n` +
      `  Allow? [y/N] `

    const fd = this.tty.openTty()
    if (fd === null)
      return { behavior: 'deny', message: 'No terminal available for interactive prompt' }

    try {
      this.tty.writeTty(fd, prompt)
      const answer = this.tty.readTty(fd).trim().toLowerCase()
      return answer === 'y' || answer === 'yes'
        ? { behavior: 'allow', updatedInput: args.input }
        : { behavior: 'deny', message: 'User denied permission' }
    } finally {
      this.tty.closeTty(fd)
    }
  }
}
