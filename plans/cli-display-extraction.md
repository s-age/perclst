# Plan: CLI Display Extraction — Fat Controller 解消

## Goal

`analyze.ts` で実施した表示ロジック抽出（`analyzeDisplay.ts` 分離）を残りのコマンドにも適用し、
`src/cli/commands/*.ts` をすべて「オーケストレーションのみ」に揃える。

arch-cli の原則: **`src/cli/view/` が terminal 出力を所有する**。
コマンドハンドラーは resolve → validate → call → output → catch の骨格だけを持つ。

## ディレクトリ構造

表示ロジックはすべて `src/cli/view/` に集約する（実施済み）。

```
src/cli/
├── view/
│   ├── display.ts          ← 既存 (start/resume/fork/run 系の printResponse 等)
│   ├── analyzeDisplay.ts   ← 実装済み
│   ├── showDisplay.ts      ← Step 1
│   ├── listDisplay.ts      ← Step 2
│   ├── summarizeDisplay.ts ← Step 2
│   ├── rewindDisplay.ts    ← Step 3
│   └── sweepDisplay.ts     ← Step 3
├── commands/
├── components/
├── index.ts
└── prompt.ts
```

`display.ts` / `analyzeDisplay.ts` はすでに `src/cli/view/` に移動済み。
すべての import パスおよびテストの `vi.mock` パスも `@src/cli/view/display` に更新済み。

## 対象コマンドの診断

### 🔴 高優先度 — 表示ヘルパー関数がコマンドファイル内に定義されている

| ファイル | 問題 | 抽出先 |
|---|---|---|
| `show.ts` (86 行) | `truncate()` / `printTurnsTable()` がコマンド内に定義 | `view/showDisplay.ts` |
| `list.ts` (48 行) | Table 構築がコマンド本体にべた書き | `view/listDisplay.ts` |
| `summarize.ts` (63 行) | Table 構築 + `formatKilo` 呼び出しがコマンド本体に | `view/summarizeDisplay.ts` |

### 🟡 中優先度 — 表示ロジックがコマンド本体に混在

| ファイル | 問題 | 抽出先 |
|---|---|---|
| `rewind.ts` (75 行) | `handleListMode()` は表示ロジックだが command file 内にある | `view/rewindDisplay.ts` |
| `sweep.ts` (65 行) | 削除結果のフォーマットループがコマンド本体に | `view/sweepDisplay.ts` |

### ✅ 対応不要 — クリーン or トリビアル

| ファイル | 理由 |
|---|---|
| `start.ts`, `resume.ts`, `fork.ts` | `printResponse` / `printStreamEvent` を `view/display.ts` 経由で使用済み。セッション ID 表示・resume ヒントはナビゲーション情報であり View ではない |
| `inspect.ts`, `curate.ts`, `survey.ts`, `chat.ts` | 同上 |
| `rename.ts`, `import.ts` | 出力は 3〜4 行のフラットな確認メッセージのみ。Table / ヘルパー関数なし。抽出コストが便益を上回る |
| `delete.ts`, `tag.ts` | 1〜2 行。トリビアル |

## Step 1 — `show.ts` (高優先度)

### `src/cli/view/showDisplay.ts` (新規)

```ts
import Table from 'cli-table3'
import ansis from 'ansis'
import type { Session } from '@src/types/session'
import type { TurnRow } from '@src/types/display'
import { stdout } from '@src/utils/output'
import { toLocaleString } from '@src/utils/date'

function truncate(text: string, max: number): string { ... }

export function printShowText(session: Session): void {
  stdout.print(`\nSession: ${session.id}`)
  if (session.name) stdout.print(`Name:    ${session.name}`)
  stdout.print(`Created: ${toLocaleString(session.created_at)}`)
  stdout.print(`Updated: ${toLocaleString(session.updated_at)}`)
  stdout.print(`Status:  ${session.metadata.status}`)
  stdout.print(`Dir:     ${session.working_dir}`)
  if (session.procedure) stdout.print(`Proc:    ${session.procedure}`)
  if (session.metadata.labels.length > 0)
    stdout.print(`Labels:  ${session.metadata.labels.join(', ')}`)
}

export function printTurnsTable(rows: TurnRow[], length?: number): void { ... }
```

### `src/cli/commands/show.ts` (変更)

- `truncate`, `printTurnsTable` の定義を削除
- コマンド本体の `stdout.print(...)` メタデータブロックを `printShowText(session)` 1 呼び出しに置換
- import を `@src/cli/view/showDisplay` に変更

### テスト

- 既存 `__tests__/show/display.test.ts` は `showCommand` ごしに stdout をアサートしているため変更不要
- 必要なら `src/cli/__tests__/display/showDisplay.test.ts` を追加して `printShowText` / `printTurnsTable` を単体テスト

## Step 2 — `list.ts` / `summarize.ts` (高優先度)

### `src/cli/view/listDisplay.ts` (新規)

```ts
import Table from 'cli-table3'
import type { Session } from '@src/types/session'
import { stdout } from '@src/utils/output'

export function printSessionsTable(sessions: Session[]): void {
  const table = new Table({
    head: ['Status', 'Name', 'ID', 'Working Dir', 'Procedure', 'Labels'],
    style: { head: [], border: [] }
  })
  for (const s of sessions) {
    table.push([
      s.metadata.status,
      s.name ?? '—',
      s.id,
      s.working_dir,
      s.procedure ?? '—',
      s.metadata.labels.join(', ') || '—'
    ])
  }
  stdout.print(table.toString())
}
```

### `src/cli/view/summarizeDisplay.ts` (新規)

```ts
import Table from 'cli-table3'
import type { SummarizeRow } from '@src/types/analysis'  // 型名は実際に合わせる
import { stdout } from '@src/utils/output'
import { formatKilo } from '@src/utils/token'

export function printSummarizeJson(rows: SummarizeRow[]): void {
  stdout.print(JSON.stringify(rows, null, 2))
}

export function printSummarizeTable(rows: SummarizeRow[]): void {
  const table = new Table({ head: [...], style: { head: [], border: [] } })
  for (const row of rows) { table.push([...]) }
  stdout.print(table.toString())
}
```

### コマンド側変更

- `list.ts`: Table 構築ブロックを `printSessionsTable(sessions)` に置換、import を `@src/cli/view/listDisplay` に変更
- `summarize.ts`: JSON / Table 出力を `printSummarizeJson` / `printSummarizeTable` に置換、import を `@src/cli/view/summarizeDisplay` に変更

## Step 3 — `rewind.ts` / `sweep.ts` (中優先度)

### `src/cli/view/rewindDisplay.ts` (新規)

```ts
import type { RewindTurn } from '@src/types/analysis'  // 型名は実際に合わせる
import { stdout } from '@src/utils/output'

export function printRewindList(turns: RewindTurn[], displayLength: number): void {
  for (const turn of turns) {
    const preview = turn.text.length > displayLength
      ? turn.text.slice(0, displayLength) + '…'
      : turn.text
    stdout.print(`  ${turn.index}: ${preview}`)
  }
}
```

`rewind.ts` から `handleListMode()` を削除し、`printRewindList()` 呼び出しに置換。
import を `@src/cli/view/rewindDisplay` に変更。

### `src/cli/view/sweepDisplay.ts` (新規)

```ts
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
```

`sweep.ts` の結果フォーマットループを `printSweepResult(targets, input.dryRun)` に置換。
import を `@src/cli/view/sweepDisplay` に変更。

## 制約

- 各 Step 完了後に `ts_checker` を実行してから次の Step へ進む
- `*Display.ts` はすべて `src/cli/view/` に置く
- `view/` の import は `validators`, `services`, `types`, `errors`, `utils`, `constants` のみ許可（`repositories` / `infrastructures` 不可）
- 既存テストは `@src/utils/output` の stdout モックを通じてアサートしているため、表示関数を移動しても基本的に変更不要。表示関数を単独でテストしたい場合は `src/cli/__tests__/display/` に追加する

## 実施順序

```
Step 1: show.ts        → view/showDisplay.ts        (高・独立)
Step 2: list.ts        → view/listDisplay.ts        (高・独立)
        summarize.ts   → view/summarizeDisplay.ts   (高・独立、Step 2 と並行可)
Step 3: rewind.ts      → view/rewindDisplay.ts      (中・独立)
        sweep.ts       → view/sweepDisplay.ts       (中・独立、Step 3 と並行可)
```

各 Step は他に依存しないため、Step 2 内・Step 3 内はそれぞれ並行実施可能。
