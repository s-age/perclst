import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Config } from '@src/types/config'

/** Creates and returns a tmpdir. Delete with cleanup(). */
export function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'perclst-integration-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** Minimal test Config with sessions_dir pointing to tmpdir */
export function buildTestConfig(sessionsDir: string, overrides?: Partial<Config>): Config {
  return {
    model: 'claude-sonnet-4-6',
    sessions_dir: sessionsDir,
    ...overrides
  }
}
