# Plan: CLI E2E tests with DI infrastructure mocks

## Goal

`startCommand` / `resumeCommand` を対象に、`ClaudeCodeInfra` だけをスタブ化した
E2E テストを追加する。

検証対象は **service → domain → repository → 実 FsInfra (tmpdir)** の統合パス。
`claude` プロセスを実行せずに、セッション永続化・引数伝播・エラー伝播を確認する。

## Key Design Decisions

1. **スタブ境界は `ClaudeCodeInfra` のみ**
   `runClaude` がプロセス起動の唯一の接点。それ以外のインフラ（`FsInfra`・`GitInfra` 等）は
   実実装のままにして統合度を保つ。

2. **`setupContainer` の config override を利用**
   今回追加した `overrides.config` で `sessions_dir` を `mkdtempSync` の tmpdir に向ける。
   各テストの `beforeEach` で `setupContainer({ config, infras: { claudeCodeInfra: stub } })`
   を呼ぶ。`register()` は `Map.set` なので呼ぶたびに全バインディングが上書きされ、
   テスト間の汚染はない。

3. **出力層とプロセス終了は mock**
   `@src/utils/output`・`@src/cli/display`・`@src/cli/prompt` を `vi.mock`。
   `process.exit` を `vi.spyOn`。これらは I/O であり E2E の検証対象外。
   E2E テストは「session JSON が tmpdir に存在する」「infra に渡った prompt が正しい」
   などデータフローを検証する。

4. **outputOnly: true で interactive 分岐を回避**
   `startCommand` の `confirmIfDuplicateName`・`resumeCommand` の
   `handleWorkingDirMismatch` はどちらも `outputOnly: true`（`streaming: false`）で
   スキップされる。E2E テストはすべて `outputOnly: true` で呼ぶ。

5. **ファイル配置と命名: `*.e2e.test.ts`**
   `src/cli/commands/__tests__/e2e/` 以下に置く。vitest のデフォルト収集グロブ
   (`**/*.test.ts`) に含まれるため `vitest.config.ts` の変更不要。

6. **JSONL スタブ形式**
   `ClaudeCodeRepository` が期待する stream-json 形式の最小シーケンス:
   ```
   {"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"<text>"}],"usage":{"input_tokens":10,"output_tokens":5}}}
   {"type":"result","result":"<text>","usage":{"input_tokens":10,"output_tokens":5}}
   ```
   `result` イベントの `result` フィールドが `RawOutput.content` になる。

## Files

### 1. `src/core/di/setup.ts` (modified — 実装済み)

`ContainerOverrides` に `config?: Config` を追加し、
`setupContainer` 冒頭で `overrides?.config ?? loadConfig()` に変更。

### 2. `src/cli/commands/__tests__/e2e/helpers.ts` (new)

E2E テストが共有するファクトリ関数群。

```ts
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { vi } from 'vitest'
import type { ClaudeCodeInfra } from '@src/infrastructures/claudeCode'
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
export function buildClaudeCodeStub(lines: string[]): ClaudeCodeInfra {
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
  } as unknown as ClaudeCodeInfra
}

/** tmpdir を作成して返す。cleanup() で削除する。 */
export function makeTmpDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'perclst-e2e-'))
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
```

### 3. `src/cli/commands/__tests__/e2e/start.e2e.test.ts` (new)

```ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readdirSync } from 'fs'
import { readJson } from '@src/infrastructures/fs'
import { join } from 'path'
import { startCommand } from '../../start'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/cli/prompt')

describe('startCommand (E2E)', () => {
  let dir: string
  let cleanup: () => void
  let exitSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ({ dir, cleanup } = makeTmpDir())
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('session JSON が tmpdir に作成される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: true })

      const files = readdirSync(dir).filter(f => f.endsWith('.json'))
      expect(files).toHaveLength(1)
    })

    it('session の status が active になる', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('test task', { outputOnly: true })

      const [file] = readdirSync(dir).filter(f => f.endsWith('.json'))
      const session = readJson<Session>(join(dir, file))
      expect(session.metadata.status).toBe('active')
    })

    it('runClaude に task が prompt として渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('my task text', { outputOnly: true })

      const [, prompt] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [string[], string, ...unknown[]]
      expect(prompt).toBe('my task text')
    })

    it('procedure オプションが system として渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('done'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await startCommand('task', { outputOnly: true, procedure: 'conductor' })

      const session = (() => {
        const [file] = readdirSync(dir).filter(f => f.endsWith('.json'))
        return readJson<Session>(join(dir, file))
      })()
      expect(session.procedure).toBe('conductor')
    })
  })

  describe('error path', () => {
    it('runClaude が throw したとき process.exit(1) が呼ばれる', async () => {
      const stub = buildClaudeCodeStub([])
      ;(stub.runClaude as ReturnType<typeof vi.fn>).mockImplementation(async function* () {
        throw new Error('spawn failed')
      })
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await expect(startCommand('task', { outputOnly: true })).rejects.toThrow('exit')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
```

#### 実装上の注意

- `startCommand` は `parseStartSession` を内部で呼ぶ。引数バリデーション違反のケースは既存の
  unit テスト (`start.test.ts`) がカバー済みなので E2E では扱わない。
- `runClaude` のシグネチャは
  `(args, prompt, workingDir, sessionFilePath?, signal?): AsyncGenerator<string>` 。
  `mock.calls[0]` の各インデックスを型アサーションで取り出す。

### 4. `src/cli/commands/__tests__/e2e/resume.e2e.test.ts` (new)

```ts
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { join } from 'path'
import { writeJson, readJson } from '@src/infrastructures/fs'
import { startCommand } from '../../start'
import { resumeCommand } from '../../resume'
import { setupContainer } from '@src/core/di/setup'
import { makeResultLines, buildClaudeCodeStub, makeTmpDir, buildTestConfig } from './helpers'
import type { Session } from '@src/types/session'

vi.mock('@src/utils/output')
vi.mock('@src/cli/display')
vi.mock('@src/cli/prompt')

describe('resumeCommand (E2E)', () => {
  let dir: string
  let cleanup: () => void
  let sessionId: string

  beforeEach(async () => {
    ({ dir, cleanup } = makeTmpDir())
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit') })

    // start でセッションを作成してから resume テストを行う
    const startStub = buildClaudeCodeStub(makeResultLines('started'))
    setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
    await startCommand('initial task', { outputOnly: true })

    // 作成された session ID を取得
    const { readdirSync } = await import('fs')
    const [file] = readdirSync(dir).filter(f => f.endsWith('.json'))
    sessionId = file.replace('.json', '')
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('resume 後も session ファイルが存在する', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue the work', { outputOnly: true })

      const { existsSync } = await import('fs')
      expect(existsSync(join(dir, `${sessionId}.json`))).toBe(true)
    })

    it('buildArgs に resume action が渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'continue', { outputOnly: true })

      // runClaude の第1引数は buildArgs の戻り値（stub は ['-p'] 固定）なので検証不可。
      // dispatch が resume action を正しく構築したことを buildArgs への入力で検証する。
      const [action] = (stub.buildArgs as ReturnType<typeof vi.fn>).mock.calls[0] as [{ type: string }]
      expect(action.type).toBe('resume')
    })

    it('instruction が prompt として渡される', async () => {
      const stub = buildClaudeCodeStub(makeResultLines('resumed'))
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await resumeCommand(sessionId, 'do the next step', { outputOnly: true })

      const [, prompt] = (stub.runClaude as ReturnType<typeof vi.fn>).mock.calls[0] as [string[], string, ...unknown[]]
      expect(prompt).toBe('do the next step')
    })
  })

  describe('error path', () => {
    it('存在しない sessionId は process.exit(1) になる', async () => {
      const stub = buildClaudeCodeStub([])
      setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: stub } })

      await expect(
        resumeCommand('nonexistent-id', 'continue', { outputOnly: true })
      ).rejects.toThrow('exit')
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})
```

#### 実装上の注意

- `beforeEach` で `startCommand` を使ってセッションを生成する。これにより resume テストが
  実際の session JSON を参照できる。
- `setupContainer` は `beforeEach` で stub と共に再度呼ぶことで、start 用と resume 用の
  `ClaudeCodeInfra` を独立させる。
- `handleWorkingDirMismatch` は `outputOnly: true`（`streaming=false`）で即 return するため
  mock 不要。`@src/cli/prompt` の mock は `confirmIfDuplicateName` のみを防ぐ目的。
- `buildArgs` スタブは `['-p']` 固定。`dispatch` が `runClaude` の第1引数に使うため、
  `runClaude.mock.calls[0][0]` で `--resume` を検証しようとしても失敗する。
  resume action の正しい構築は `buildArgs.mock.calls[0][0].type === 'resume'` で確認すること。

## Verification

各ファイル追加後に `ts_checker()` を実行。`ok: true` を確認してから次へ。

テスト単体の確認:
```bash
npx vitest run src/cli/commands/__tests__/e2e/
```

## 作業順序

1. `src/cli/commands/__tests__/e2e/helpers.ts` — ファクトリ群を作成
2. `src/cli/commands/__tests__/e2e/start.e2e.test.ts` — start E2E テストを追加、ts_checker
3. `src/cli/commands/__tests__/e2e/resume.e2e.test.ts` — resume E2E テストを追加、ts_checker
