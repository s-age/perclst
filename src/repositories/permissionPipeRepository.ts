import type { IPermissionPipeRepository } from '@src/repositories/ports/permissionPipe.js'
import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'
import { fileExists, readText, removeFileSync, writeText } from '@src/infrastructures/fs.js'

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
}
