import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export type IPermissionPipeDomain = {
  pollRequest(): PermissionRequest | null
  respond(result: PermissionResult): void
}
