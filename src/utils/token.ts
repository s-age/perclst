/** Formats a token count as a k-unit string with one decimal place (floor). e.g. 56337 → "56.3k" */
export function formatKilo(n: number): string {
  return `${(Math.floor(n / 100) / 10).toFixed(1)}k`
}
