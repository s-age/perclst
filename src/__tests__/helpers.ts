import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Config } from '@src/types/config'

/** tmpdir を作成して返す。cleanup() で削除する。 */
export function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'perclst-integration-'))
  return { dir, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** sessions_dir を tmpdir に向けた最小テスト用 Config */
export function buildTestConfig(sessionsDir: string, overrides?: Partial<Config>): Config {
  return {
    model: 'claude-sonnet-4-6',
    sessions_dir: sessionsDir,
    ...overrides
  }
}
