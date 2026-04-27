import { z } from 'zod'

export const tsCallGraphParams = {
  file_path: z.string().describe('Path to the TypeScript file to trace'),
  entry: z
    .string()
    .optional()
    .describe(
      'Entry point symbol to trace. Use "functionName" for functions, "ClassName.methodName" for methods. Omit to trace all exported functions.'
    ),
  max_depth: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe('Maximum recursion depth (default: 5)')
}
