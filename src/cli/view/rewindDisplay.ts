import type { RewindTurn } from '@src/types/analysis'
import { stdout } from '@src/utils/output'

export function printRewindList(turns: RewindTurn[], displayLength: number): void {
  for (const turn of turns) {
    const preview =
      turn.text.length > displayLength ? turn.text.slice(0, displayLength) + '…' : turn.text
    stdout.print(`  ${turn.index}: ${preview}`)
  }
}
