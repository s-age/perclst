export function formatInputSummary(input: Record<string, unknown>): string {
  const primary = input.command ?? input.file_path ?? input.path ?? input.url ?? input.pattern
  if (primary !== undefined) return String(primary)
  const json = JSON.stringify(input, null, 2)
  const lines = json.split('\n')
  return lines.length > 6 ? lines.slice(0, 6).join('\n') + '\n  ...' : json
}
