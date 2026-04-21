import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export type IPermissionPipeRepository = {
  pollRequest(): PermissionRequest | null
  respond(result: PermissionResult): void
  askPermission(args: {
    tool_name: string
    input: Record<string, unknown>
    tool_use_id?: string
  }): Promise<PermissionResult>
}
