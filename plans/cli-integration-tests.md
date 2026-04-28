# CLI Integration Tests — 計画書

`start` / `resume` 以外の `src/cli/commands/` 配下コマンド全体を対象とした
インテグレーションテスト追加計画。

## 実装手順

各コマンドのテストを実装するときは **`procedures/test-integration/implement.md`** の手順に従うこと。

```bash
perclst start "Write integration tests for <command> command" \
  --procedure test-integration/implement \
  --output-only
```

この計画書は「何をテストするか」の仕様書。手順（どう書くか）は procedure 側に委ねる。

---

## 基本方針

### 参照実装
`resume.integration.test.ts` / `start.integration.test.ts` の構造に統一する。

- `vi.mock('@src/utils/output')` / `vi.mock('@src/cli/view/display')` / `vi.mock('@src/cli/prompt')`
- `buildClaudeCodeStub` + `setupContainer` で DI を差し替え
- `makeTmpDir` で完全に独立した一時ディレクトリを使用
- `beforeEach` で `vi.clearAllMocks()` + `process.exit` をモック

### Vitest ワーカー分離（必須）

**1 ファイル = 1 Vitest セッション（worker プロセス）**。

- Vitest のデフォルト `isolate: true` を維持すること
- `--singleThread` / `--pool=vmThreads` での実行は不可
- `setupContainer` が container シングルトンを書き換えるため、ファイル間でワーカーが共有されると状態汚染が起きる

### 前提セッション作成パターン

sessionId を引数に取るコマンドは、`beforeEach` 内で `startCommand` を実行して
セッションを先に作成してから取得する（`resume.integration.test.ts` と同じパターン）:

```ts
const startStub = buildClaudeCodeStub(makeResultLines('started'))
setupContainer({ config: buildTestConfig(dir), infras: { claudeCodeInfra: startStub } })
await startCommand('initial task', { outputOnly: true })
const [file] = readdirSync(dir).filter((f) => f.endsWith('.json'))
sessionId = file.replace('.json', '')
```

---

## Phase 1 — Pure session management（エージェント呼び出しなし）

エラーパスは `process.exit(1)` と `stderr.print` の確認のみ。
`claudeCodeInfra` スタブ不要。

---

### `delete.integration.test.ts`

**対象**: `deleteCommand(sessionId)`

| ケース | 検証内容 |
|---|---|
| happy: 存在するセッションを削除 | JSON ファイルが消える |
| happy: stdout に `Session deleted: <id>` | `vi.mocked(stdout).print` 確認 |
| error: 存在しない sessionId | `process.exit(1)` |

---

### `tag.integration.test.ts`

**対象**: `tagCommand(sessionId, labels)`

| ケース | 検証内容 |
|---|---|
| happy: ラベルが session.metadata.labels に保存される | JSON を直接読んで検証 |
| happy: 複数ラベル指定 | `['a', 'b']` が正しく保存される |
| happy: 空配列でラベルをクリア | `labels: []` |
| error: 存在しない sessionId | `process.exit(1)` |

---

### `list.integration.test.ts`

**対象**: `listCommand(options)`

| ケース | 検証内容 |
|---|---|
| happy: セッションなし | `stdout.print('No sessions found')` |
| happy: セッションあり | `printSessionsTable` が呼ばれる |
| happy: `--label` フィルタ | 対象セッションのみ返る（tag してから list） |
| happy: `--like` フィルタ | 名前部分一致 |
| error: ValidationError | `process.exit(1)` |

`printSessionsTable` は `vi.mock('@src/cli/view/listDisplay')` でモック。

---

### `rename.integration.test.ts`

**対象**: `renameCommand(sessionId, name, options)`

| ケース | 検証内容 |
|---|---|
| happy: 名前が session.name に保存される | JSON を読んで検証 |
| happy: `--labels` と同時指定 | `metadata.labels` も更新される |
| happy: `confirmIfDuplicateName` が呼ばれる | `vi.mocked(confirmIfDuplicateName)` 確認 |
| error: UserCancelledError（confirmIfDuplicateName が throw） | `process.exit(0)` + `'Cancelled.'` |
| error: 存在しない sessionId | `process.exit(1)` |

---

### `show.integration.test.ts`

**対象**: `showCommand(sessionId, options)`

AnalyzeService は `readJsonlContent` が空を返すスタブ経由で動作する。

| ケース | 検証内容 |
|---|---|
| happy: デフォルト表示 | `printShowText` が呼ばれる |
| happy: `--format json` | `stdout.print` に JSON 文字列が渡る |
| happy: turns が 0 件 | `(no turns)` が出力される |
| error: 存在しない sessionId | `process.exit(1)` |

`printShowText` / `printTurnsTable` は `vi.mock('@src/cli/view/showDisplay')` でモック。

---

### `sweep.integration.test.ts`

**対象**: `sweepCommand(options)`

| ケース | 検証内容 |
|---|---|
| happy: マッチなし | `'No sessions matched...'` |
| happy: dryRun: true | ファイルが残る + `printSweepResult` 呼び出し確認 |
| happy: 実削除（force: true） | ファイルが消える |
| happy: `--status` フィルタ | 対象セッションのみ削除 |
| error: ValidationError（不正な日付形式など） | `process.exit(1)` + `'Invalid arguments:'` |

`printSweepResult` は `vi.mock('@src/cli/view/sweepDisplay')` でモック。

---

### `rewind.integration.test.ts`

**対象**: `rewindCommand(sessionId, indexStr, options)`

AnalyzeService の `getRewindTurns` / `resolveTurnByIndex` が JSONL に依存するため、
`makeResultLines` で turns を持つ fixture を使う。

| ケース | 検証内容 |
|---|---|
| happy: `--list` でターン一覧 | `printRewindList` が呼ばれる |
| happy: `--list` でターンなし | `'No assistant turns found.'` |
| happy: index 指定でスナップショットセッション作成 | 新 JSON ファイルが増える |
| error: index も --list もなし | `process.exit(1)` + `'Either --list or an index argument is required'` |
| error: 存在しない sessionId | `process.exit(1)` |
| error: 範囲外 index（RangeError） | `process.exit(1)` + `error.message` |

`printRewindList` は `vi.mock('@src/cli/view/rewindDisplay')` でモック。

---

## Phase 2 — Agent-wrapping（`claudeCodeInfra` スタブ必要）

`buildClaudeCodeStub` + `makeResultLines` を使う。
エラーパスは `makeThrowingStub` パターンで `ValidationError` / `RateLimitError` を確認。

---

### `analyze.integration.test.ts`

**対象**: `analyzeCommand(sessionId, options)`

| ケース | 検証内容 |
|---|---|
| happy: デフォルト（text 形式） | `printAnalyzeText` が呼ばれる |
| happy: `--format json` | `printAnalyzeJson` が呼ばれる |
| happy: `--printDetail` | `printAnalyzeDetail` が呼ばれる |
| error: 存在しない sessionId | `process.exit(1)` |
| error: ValidationError | `process.exit(1)` + `'Invalid arguments:'` |

`printAnalyzeText` / `printAnalyzeJson` / `printAnalyzeDetail` は
`vi.mock('@src/cli/view/analyzeDisplay')` でモック。

---

### `summarize.integration.test.ts`

**対象**: `summarizeCommand(options)`

| ケース | 検証内容 |
|---|---|
| happy: セッションなし | `'No sessions found'` |
| happy: text 形式 | `printSummarizeTable` が呼ばれる |
| happy: `--format json` | `printSummarizeJson` が呼ばれる |
| happy: `--label` / `--like` フィルタ | 対象行のみ返る |
| error: ValidationError | `process.exit(1)` |

`printSummarizeTable` / `printSummarizeJson` は
`vi.mock('@src/cli/view/summarizeDisplay')` でモック。

---

### `fork.integration.test.ts`

**対象**: `forkCommand(originalSessionId, prompt, options)`

`beforeEach` で start → sessionId 取得。`fork` 自体は別スタブで実行。

| ケース | 検証内容 |
|---|---|
| happy: 新セッション JSON ファイルが増える（計 2 ファイル） | `readdirSync` で確認 |
| happy: `buildArgs` に resume action が渡る | `stub.buildArgs.mock.calls[0]` で `type === 'resume'` |
| happy: prompt が runClaude に渡る | `stub.runClaude.mock.calls[0][1]` |
| happy: `stdout.print` に `Session forked:` が含まれる | mocked stdout 確認 |
| error: ValidationError | `process.exit(1)` + `'Invalid arguments:'` |
| error: RateLimitError（resetInfo あり） | `'Resets:'` 含むメッセージ |
| error: RateLimitError（resetInfo なし） | Resets なし |
| error: Generic Error | `'Failed to fork session'` |

---

### `survey.integration.test.ts`

**対象**: `surveyCommand(options)`

| ケース | 検証内容 |
|---|---|
| happy: デフォルト（outputOnly: true） | `printResponse` が呼ばれる |
| happy: `--refresh` フラグで別 allowedTools セット | `stub.buildArgs` の引数確認 |
| error: ValidationError | `process.exit(1)` + `'Invalid arguments:'` |
| error: RateLimitError | メッセージ確認 |

---

### `review.integration.test.ts`

**対象**: `reviewCommand(targetPath, options)`

inspect パターン（固定 procedure）のため、`agentService.start` の呼び出しを検証。

| ケース | 検証内容 |
|---|---|
| happy: `printResponse` が呼ばれる | |
| happy: targetPath なし | デフォルト動作 |
| error: ValidationError | `'Invalid arguments:'` |
| error: RateLimitError（resetInfo あり/なし） | 各メッセージ |

---

### `retrieve.integration.test.ts`

**対象**: `retrieveCommand(keywords)`

| ケース | 検証内容 |
|---|---|
| happy: keywords が task 文字列に含まれる | `stub.runClaude.mock.calls[0][1]` で確認 |
| happy: `printResponse` が呼ばれる | |
| error: ValidationError | `'Invalid arguments:'` |
| error: RateLimitError | メッセージ確認 |

---

### `curate.integration.test.ts`

**対象**: `curateCommand()`

`KnowledgeSearchService.hasDraftEntries` が `false` の場合は早期リターン。

| ケース | 検証内容 |
|---|---|
| happy: draft なし | `stdout.print('No draft entries to curate.')` |
| happy: draft あり | `printResponse` が呼ばれる |
| error: ValidationError | `'Invalid arguments:'` |
| error: RateLimitError | メッセージ確認 |

`KnowledgeSearchService` は `setupContainer` の `infras` に mock を注入するか、
`vi.spyOn` で `hasDraftEntries` を差し替える。

---

## Phase 3 — 複雑・特殊コマンド

外部依存や固有のセットアップが必要なコマンド。
実装前に追加調査が必要なものを含む。

---

### `import.integration.test.ts`

**対象**: `importCommand(claudeSessionId, options)`

`ImportService` が DI 経由で注入されるため、スタブが必要。

| ケース | 検証内容 |
|---|---|
| happy: session が作成される | `stdout.print('Imported: ...')` |
| happy: `--name` 指定 | `confirmIfDuplicateName` が呼ばれる |
| happy: `--labels` 指定 | session に labels が保存される |
| error: UserCancelledError | `process.exit(0)` + `'Cancelled.'` |
| error: Generic Error | `process.exit(1)` + `'Failed to import session'` |

`ImportService` は `setupContainer` の infras injection、または
`container.resolve` を `vi.spyOn` で差し替える。

---

### `chat.integration.test.ts`

**対象**: `chatCommand(sessionId)`

`agentService.chat` が `spawnInteractive` を呼ぶ。TTY 判定があるため注意。

| ケース | 検証内容 |
|---|---|
| happy: `spawnInteractive` が呼ばれる | `stub.spawnInteractive` の呼び出し確認 |
| error: UserCancelledError | `process.exit(0)` + `'Cancelled.'` |
| error: ValidationError | `'Invalid arguments:'` |
| error: Generic Error | `process.exit(1)` + `'Failed to start chat session'` |

`handleWorkingDirMismatch` は `vi.mock('@src/cli/prompt')` でモック済み。

---

### `run.integration.test.ts`

**対象**: `runCommand(pipelineFilePath, options)`

`PipelineService` / `PipelineFileService` / `PermissionPipeService` / `AbortService` の
スタブが必要。最も複雑なコマンドのため実装は最後。

| ケース | 検証内容 |
|---|---|
| happy: シングルタスクパイプライン完了 | `stdout.print` にタスク結果 |
| happy: `--dry-run` 相当（confirm が No） | タスク実行なし |
| happy: `--outputOnly` | streaming なし |
| error: ValidationError | `'Invalid arguments:'` |
| error: RateLimitError | メッセージ確認 |
| error: PipelineMaxRetriesError | `process.exit(1)` |

---

### `forge.integration.test.ts`

**対象**: `forgeCommand(planFilePath, options)`

`PlanFileService.exists` が `false` の場合は早期 exit。

| ケース | 検証内容 |
|---|---|
| happy: plan ファイルあり → `printResponse` が呼ばれる | |
| error: plan ファイルなし | `process.exit(1)` + `'Plan file not found:'` |
| error: ValidationError | `'Invalid arguments:'` |
| error: RateLimitError | メッセージ確認 |

実際のファイルを tmpdir に作成するか、`PlanFileService.exists` を mock する。

---

### `inspect.integration.test.ts`

**対象**: `inspectCommand(oldRef, newRef, options)`

`PipelineFileService.getDiff` が `null` の場合は早期リターン。

| ケース | 検証内容 |
|---|---|
| happy: diff あり → `printResponse` が呼ばれる | |
| happy: diff なし | `stdout.print('No differences found...')` |
| error: ValidationError | `'Invalid arguments:'` |
| error: RateLimitError | メッセージ確認 |

`PipelineFileService` は mock または `setupContainer` の infras injection。

---

## 実装順序

```
Phase 1 (セッション管理系 — 独立性高、リスク低)
  1. delete
  2. tag
  3. list
  4. rename
  5. show
  6. sweep
  7. rewind

Phase 2 (エージェント呼び出し系 — start/resume の延長)
  8. analyze
  9. summarize
 10. fork
 11. survey
 12. review
 13. retrieve
 14. curate

Phase 3 (複雑・追加調査必要)
 15. import
 16. chat
 17. forge
 18. inspect
 19. run  ← 最後
```

---

## チェックリスト（各ファイル共通）

- [ ] ファイル名: `<command>.integration.test.ts`
- [ ] `describe('<command>Command (integration)', ...)`
- [ ] `vi.mock` 3 点セット（output / display / prompt）
- [ ] `beforeEach`: `clearAllMocks` + `makeTmpDir` + `process.exit` mock
- [ ] `afterEach`: `cleanup` + `restoreAllMocks`
- [ ] sessionId を使うコマンドは `beforeEach` で `startCommand` で事前作成
- [ ] happy path と error path を `describe` で分ける
- [ ] Vitest `isolate: true`（デフォルト）を破る設定を入れない
