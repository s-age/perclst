import type { Session } from '@src/types/session'
import { stdout } from '@src/utils/output'

export function printSweepResult(targets: Session[], dryRun: boolean): void {
  if (dryRun) {
    stdout.print(`\n[dry-run] ${targets.length} session(s) would be deleted:\n`)
  } else {
    stdout.print(`\nDeleted ${targets.length} session(s):\n`)
  }
  for (const s of targets) {
    const label = `${s.name ?? 'anonymous'}(${s.id})`
    stdout.print(`  [${s.metadata.status}] ${label}  created: ${s.created_at.slice(0, 10)}`)
  }
}
