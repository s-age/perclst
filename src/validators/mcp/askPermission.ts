import { z } from 'zod'

export const askPermissionParams = {
  tool_name: z.string().describe('The name of the tool requesting permission'),
  input: z.record(z.string(), z.unknown()).describe('The input arguments for the tool'),
  tool_use_id: z.string().optional().describe('The unique tool use request ID')
}
