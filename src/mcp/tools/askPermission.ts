import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { PermissionPipeService } from '@src/services/permissionPipeService'

export async function executeAskPermission(args: {
  tool_name: string
  input: Record<string, unknown>
  tool_use_id?: string
}) {
  const service = container.resolve<PermissionPipeService>(TOKENS.PermissionPipeService)
  const result = await service.askPermission(args)
  return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] }
}
