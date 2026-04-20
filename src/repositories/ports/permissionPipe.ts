import type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export type IPermissionPipeRepository = {
  pollRequest(): PermissionRequest | null
  respond(result: PermissionResult): void
  askViaIPC(
    pipePath: string,
    args: { tool_name: string; input: Record<string, unknown> }
  ): Promise<PermissionResult>
  askViaTTY(args: { tool_name: string; input: Record<string, unknown> }): Promise<PermissionResult>
}
