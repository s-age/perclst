# Refactor: infrastructures を純粋 I/O に絞り込む

## 目的

アーキテクチャを以下の原則に厳密化する:

- **infrastructures**: 外部装置との通信のみ。生の出力をそのまま返す / yield する
- **repositories/parsers/**: 生の出力を typed domain 値に変換する
- **repositories**: infrastructure を呼び出してパーサーに渡し、ドメイン操作を提供する

---

## フェーズ 1 — `claudeCode.ts` ストリーム化 (主要変更)

### 変更対象ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/repositories/parsers/claudeCodeParser.ts` | **新規作成** | `StreamEvent`, `ContentBlock`, `ParseState` 型と `parseStreamEvents()` を移動 |
| `src/repositories/ports/agent.ts` | **変更** | `IClaudeCodeRepository` を追加 (現在は `IProcedureRepository` のみ) |
| `src/repositories/agentRepository.ts` | **新規作成** | `ClaudeCodeRepository` を実装 — infrastructure generator を消費しパーサーに渡す |
| `src/infrastructures/claudeCode.ts` | **変更** | `runClaude()` を `AsyncGenerator<string>` に変更; `parseStreamJson` と `ClaudeCodeRepository` クラスを削除 |
| `src/types/claudeCode.ts` | **変更** | `IClaudeCodeRepository` を削除 (→ `repositories/ports/agent.ts` へ移動) |
| `src/domains/agent.ts` | **変更** | `IClaudeCodeRepository` の import パスを更新 |
| `src/domains/__tests__/agentDomain.test.ts` | **変更** | 同上 |
| `src/core/di/setup.ts` | **変更** | `ClaudeCodeRepository` の import 元を `repositories/agentRepository` に変更 |

### 詳細設計

#### `src/repositories/parsers/claudeCodeParser.ts` (新規)

`claudeCode.ts` から以下を移動:
- `ContentBlock` 型 (union type)
- `StreamEvent` 型
- `ParseState` 型
- `processAssistantEvent()` 関数
- `processUserEvent()` 関数
- `parseStreamJson()` → リネームして `parseStreamEvents(lines: string[], jsonlBaseline: number): RawOutput`

```ts
// エクスポートするシグネチャ
export function parseStreamEvents(lines: string[], jsonlBaseline: number): RawOutput
```

#### `src/repositories/ports/agent.ts` (変更)

```ts
// 追加
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'

export type IClaudeCodeRepository = {
  dispatch(action: ClaudeAction): Promise<RawOutput>
}
```

#### `src/repositories/agentRepository.ts` (新規)

```ts
import { buildArgs, countJsonlLines, resolveJsonlPath, buildMcpConfig } from '@src/infrastructures/claudeCode'
import { parseStreamEvents } from '@src/repositories/parsers/claudeCodeParser'
import type { IClaudeCodeRepository } from '@src/repositories/ports/agent'
import type { ClaudeAction, RawOutput } from '@src/types/claudeCode'

export class AgentRepository implements IClaudeCodeRepository {
  async dispatch(action: ClaudeAction): Promise<RawOutput> {
    // buildArgs, countJsonlLines などのヘルパーを infrastructure から呼び出す
    // runClaude generator を for-await で消費して lines を収集
    // parseStreamEvents(lines, baseline) を呼び出して返す
  }
}
```

> **注意**: クラス名は `AgentRepository` ではなく `ClaudeCodeRepository` のままにする選択もある。
> ただし既存の `TOKENS.ClaudeCodeRepository` との整合性を保つため、クラス名は `ClaudeCodeRepository` を維持し
> import パスのみ変更する方が DI 変更を最小化できる。

#### `src/infrastructures/claudeCode.ts` (変更)

削除:
- `ContentBlock` 型
- `StreamEvent` 型  
- `ParseState` 型
- `processAssistantEvent()`
- `processUserEvent()`
- `parseStreamJson()`
- `ClaudeCodeRepository` クラス

変更:
- `runClaude()` のシグネチャ: `Promise<RawOutput>` → `AsyncGenerator<string>`
- 実装: stdout chunks をバッファリングして `\n` 区切りで `yield`
- エラー検知 (exit code ≠ 0, RateLimitError) は process 終了後に throw — generator の外で処理

エクスポートとして残す (repository から使用):
- `buildArgs(action: ClaudeAction): string[]`
- `buildMcpConfig(): string`
- `resolveJsonlPath(sessionId, workingDir): string`
- `countJsonlLines(path): number`
- `runClaude(args, prompt, workingDir, sessionFilePath?): AsyncGenerator<string>`

---

## フェーズ 2 — ts-morph パーサーの移動

### 変更対象ファイル一覧

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/repositories/parsers/tsAnalysisParser.ts` | **新規作成** | `tsSymbolExtractor.ts` の内容を移動 |
| `src/repositories/parsers/tsAstParser.ts` | **新規作成** | `tsAstTraverser.ts` の内容を移動 |
| `src/infrastructures/tsAnalyzer.ts` | **変更** | parser import を削除; `getSourceFile()` を公開; 各メソッドから抽出ロジックを除去 |
| `src/repositories/tsAnalysisRepository.ts` | **変更** | `infra.analyzeFile()` 等の委譲を廃止; `getSourceFile()` + parser 関数を直接呼び出す |
| `src/infrastructures/parsers/tsSymbolExtractor.ts` | **削除** | |
| `src/infrastructures/parsers/tsAstTraverser.ts` | **削除** | |

### 詳細設計

#### `src/infrastructures/tsAnalyzer.ts` (変更後)

```ts
export class TsAnalyzer {
  private project: Project

  constructor(tsConfigPath?: string) {
    this.project = new Project({ tsConfigFilePath: tsConfigPath || 'tsconfig.json' })
  }

  getSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath)
  }

  // getReferences はシンボル検索 (ts-morph の API 呼び出し) であり「I/O」に分類する
  // 理由: ファイルシステムをスキャンして参照を見つける操作 = 外部装置との通信
  // → getReferences() はここに残す
  getReferences(filePath: string, symbolName: string, options?: { includeTest?: boolean }): ReferenceInfo[]
}
```

> **設計判断**: `getReferences()` は ts-morph がプロジェクト全体のファイルをスキャンする操作であり、
> 純粋な変換ではなくファイルI/Oを伴う。そのため infrastructure に残す。

#### `src/repositories/tsAnalysisRepository.ts` (変更後)

```ts
export class TsAnalysisRepository implements ITsAnalysisRepository {
  private infra = new TsAnalyzer()

  analyzeFile(filePath: string): TypeScriptAnalysis {
    const sf = this.infra.getSourceFile(filePath)
    return {
      file_path: filePath,
      symbols: extractSymbols(sf),
      imports: extractImports(sf),
      exports: extractExports(sf),
    }
  }

  findContainingSymbol(filePath, line, column) {
    const sf = this.infra.getSourceFile(filePath)
    return findContainingSymbol(sf, filePath, line, column)
  }

  getTypeDefinitions(filePath, symbolName) {
    const sf = this.infra.getSourceFile(filePath)
    return extractTypeDefinition(sf, symbolName)
  }

  getReferences(filePath, symbolName, options?) {
    return this.infra.getReferences(filePath, symbolName, options)
  }
}
```

---

## 実装順序

フェーズ 1 と 2 は独立しているが、フェーズ 1 内は以下の順番に従う (依存関係):

```
フェーズ 1:
1. repositories/parsers/claudeCodeParser.ts  (新規 — 依存なし)
2. repositories/ports/agent.ts               (IClaudeCodeRepository 追加)
3. infrastructures/claudeCode.ts             (generator 化、ClaudeCodeRepository 削除)
4. repositories/agentRepository.ts           (新規 — 上記 1-3 に依存)
5. types/claudeCode.ts                       (IClaudeCodeRepository 削除)
6. domains/agent.ts + test                   (import パス更新)
7. core/di/setup.ts                          (import 元を変更)
8. ts_checker で確認

フェーズ 2:
1. repositories/parsers/tsAnalysisParser.ts  (新規 — tsSymbolExtractor の内容)
2. repositories/parsers/tsAstParser.ts       (新規 — tsAstTraverser の内容)
3. infrastructures/tsAnalyzer.ts             (parser import 削除, getSourceFile 追加)
4. repositories/tsAnalysisRepository.ts      (parser 直接呼び出しに変更)
5. infrastructures/parsers/ ディレクトリ削除
6. ts_checker で確認
```

---

## 注意点

### `IClaudeCodeRepository` の型移動

- 現在: `src/types/claudeCode.ts` に定義
- 移動先: `src/repositories/ports/agent.ts`
- 影響箇所: `domains/agent.ts`, `domains/__tests__/agentDomain.test.ts`
- `RawOutput` と `ClaudeAction` は `src/types/claudeCode.ts` に残す (repositories と domains の両方が参照するため)

### `runClaude` のエラーハンドリングと早期終了

generator 化後は2つの問題を同時に扱う必要がある:

1. **consumer が途中で `break` / 例外を投げた場合のプロセス残留**
   `for await...of` を consumer 側が早期終了すると generator の `finally` ブロックは実行されるが、
   子プロセスは kill されずに残り続ける。`finally` 内で明示的に kill する必要がある。

2. **exit code の検査**
   `close` イベントは stdout が全部 yield される前後いずれかに発火する。
   generator 終端後に新たなリスナーを登録しても既に発火済みのため受け取れない。
   exit code はクロージャ変数に保持する。

推奨パターン:
```ts
export async function* runClaude(
  args: string[],
  prompt: string,
  workingDir: string,
  sessionFilePath?: string
): AsyncGenerator<string> {
  const child = spawn('claude', args, { cwd: workingDir, stdio: ['pipe', 'pipe', 'pipe'] })
  let exitCode: number | null = null
  let stderr = ''

  child.on('close', (code) => { exitCode = code })
  child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
  child.stdin.write(prompt, 'utf-8')
  child.stdin.end()

  try {
    let buffer = ''
    for await (const chunk of child.stdout) {
      buffer += (chunk as Buffer).toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) yield line
      }
    }
    if (buffer.trim()) yield buffer
  } finally {
    // consumer が途中 break / 例外でもプロセスを確実に終了させる
    if (child.exitCode === null && !child.killed) {
      child.kill()
    }
  }

  // 正常完了後の exit code チェック (close イベントはすでに発火済みのはず)
  if (exitCode !== 0) {
    const combined = stderr
    const rateLimitMatch = combined.match(/resets?\s+([^\n\r]+)/i)
    if (combined.toLowerCase().includes("you've hit your limit") ||
        combined.toLowerCase().includes('you have hit your limit')) {
      throw new RateLimitError(rateLimitMatch?.[1]?.trim())
    }
    throw new APIError(`claude exited with code ${exitCode}`)
  }
}
```

> **注意**: `close` イベントは stdout が flush された後に発火するが、タイミングによっては
> generator の `finally` 実行後もわずかに遅延する可能性がある。
> `exitCode` が `null` のままの場合は `child.exitCode` プロパティ (synchronous) でも確認できる。

### DI 変更の最小化

`TOKENS.ClaudeCodeRepository` シンボルと DI 登録は維持する。
`setup.ts` の import パスを `infrastructures/claudeCode` → `repositories/agentRepository` に変えるだけ。
