import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { vi } from 'vitest'
import type { Infras } from '@src/core/di/setupInfrastructures'
import type { Config } from '@src/types/config'

/** 最小 JSONL fixture — RawOutput.content = text になる 2 行 */
export function makeResultLines(text: string): string[] {
  return [
    JSON.stringify({
      type: 'assistant',
      message: {
        role: 'assistant',
        content: [{ type: 'text', text }],
        usage: { input_tokens: 10, output_tokens: 5 }
      }
    }),
    JSON.stringify({
      type: 'result',
      result: text,
      usage: { input_tokens: 10, output_tokens: 5 }
    })
  ]
}

/**
 * ClaudeCodeInfra のスタブ。
 * `runClaude` だけ差し替え、残りは最小 no-op。
 * vi.fn() でラップされているため呼び出し引数を検証できる。
 */
export function buildClaudeCodeStub(lines: string[]): Infras['claudeCodeInfra'] {
  const runClaude = vi.fn(async function* (): AsyncGenerator<string> {
    for (const line of lines) yield line
  })

  return {
    resolveJsonlPath: vi.fn(() => '/dev/null'),
    readJsonlContent: vi.fn(() => ''),
    buildArgs: vi.fn(() => ['-p']),
    runClaude,
    spawnInteractive: vi.fn(),
    writeStderr: vi.fn()
  } as unknown as Infras['claudeCodeInfra']
}

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
