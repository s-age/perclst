import type { IPermissionPipeRepository } from '@src/repositories/ports/permissionPipe.js'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'
import { fileExists, readText, removeFileSync, writeText } from '@src/infrastructures/fs.js'
import { openTty, writeTty, readTty, closeTty } from '@src/infrastructures/ttyInfrastructure.js'
import { formatInputSummary } from '@src/utils/formatInputSummary.js'

export class PermissionPipeRepository implements IPermissionPipeRepository {
  private get pipePath(): string | null {
    return process.env.PERCLST_PERMISSION_PIPE ?? null
  }

  pollRequest(): PermissionRequest | null {
    const p = this.pipePath
    if (!p) return null
    const reqPath = `${p}.req`
    if (!fileExists(reqPath)) return null
    try {
      const req = JSON.parse(readText(reqPath)) as PermissionRequest
      try {
        removeFileSync(reqPath)
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
      writeText(`${p}.res`, JSON.stringify(result))
    } catch {
      /* ignore */
    }
  }

  async askViaIPC(
    pipePath: string,
    args: { tool_name: string; input: Record<string, unknown> }
  ): Promise<PermissionResult> {
    const reqPath = `${pipePath}.req`
    const resPath = `${pipePath}.res`
    writeText(reqPath, JSON.stringify({ tool_name: args.tool_name, input: args.input }))
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100))
      if (fileExists(resPath)) {
        try {
          const res = JSON.parse(readText(resPath)) as PermissionResult
          try {
            removeFileSync(resPath)
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

  async askViaTTY(args: {
    tool_name: string
    input: Record<string, unknown>
  }): Promise<PermissionResult> {
    const summary = formatInputSummary(args.input)
    const prompt =
      `\nPermission Request\n` +
      `  Tool : ${args.tool_name}\n` +
      `  Input: ${summary.replace(/\n/g, '\n         ')}\n` +
      `  Allow? [y/N] `

    const fd = openTty()
    if (fd === null)
      return { behavior: 'deny', message: 'No terminal available for interactive prompt' }

    try {
      writeTty(fd, prompt)
      const answer = readTty(fd).trim().toLowerCase()
      return answer === 'y' || answer === 'yes'
        ? { behavior: 'allow', updatedInput: args.input }
        : { behavior: 'deny', message: 'User denied permission' }
    } finally {
      closeTty(fd)
    }
  }
}
