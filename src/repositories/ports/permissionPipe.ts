import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export type IPermissionPipeRepository = {
  pollRequest(): PermissionRequest | null
  respond(result: PermissionResult): void
}
