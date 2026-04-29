import { exec } from 'child_process'
import { promisify } from 'util'
import type { RawCommandOutput } from '@src/types/checker'

const execAsync = promisify(exec)

export class CommandRunnerInfra {
  async runCommand(command: string, cwd: string): Promise<RawCommandOutput> {
    try {
      const { stdout, stderr } = await execAsync(command, { cwd, encoding: 'utf-8' })
      return { stdout, stderr, exitCode: 0 }
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string; code?: number }
      return {
        stdout: err.stdout ?? '',
        stderr: err.stderr ?? '',
        exitCode: err.code ?? 1
      }
    }
  }
}
