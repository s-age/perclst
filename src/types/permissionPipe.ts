export type PermissionRequest = {
  tool_name: string
  input: Record<string, unknown>
}

export type PermissionResult =
  | { behavior: 'allow'; updatedInput: Record<string, unknown> }
  | { behavior: 'deny'; message: string }
