/**
 * Guards against single-dash multi-character options (e.g. -name instead of --name).
 * Called from the CLI entry point before commander parses arguments.
 */
export function assertNoSingleDashMultiCharOptions(args: string[]): void {
  for (const arg of args) {
    if (/^-[a-zA-Z]{2,}/.test(arg)) {
      console.error(`error: invalid option '${arg}' — did you mean '-${arg}'?`)
      process.exit(1)
    }
  }
}
