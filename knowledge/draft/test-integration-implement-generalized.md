# test-integration/implement の汎用化パターン

## 背景

MCP tools 向けの統合テストパイプラインを作る際、`test-integration/implement` 手順書を
そのまま使おうとしたが、以下の理由で直接利用不可だった：

- STEP 1 で `plans/cli-integration-tests.md` を読む（MCP 用のプランファイルが存在しない）
- STEP 3 の分類が CLI 構造前提（Pure session-management / Agent-wrapping の二択）
- STEP 4 のパスとモック対象がすべて CLI 固定（`claudeCodeInfra`、`@src/cli/view/display` 等）

## 採用した設計

新しい手順書を作らず、既存の `test-integration/implement` を汎用化した。

**入力の分岐**:
- `target_command` → `src/cli/commands/__tests__/integration/<cmd>.integration.test.ts`
- `target_tool` → `src/mcp/tools/__tests__/integration/<tool>.integration.test.ts`

**プランファイル依存の除去**:
`plans/cli-integration-tests.md` を読む STEP 1 を廃止し、
パイプラインのタスク記述に `test_cases:` / `mock_boundary:` を直接書く形に変更。

```yaml
task: >
  target_tool: knowledgeSearch

  test_cases:
    - happy path: query matches → matched entries returned
    - happy path: no match → empty result
  
  mock_boundary: なし（tmp dir に knowledge/*.md を配置）
```

## 利点

- 手順書が1つで済む（CLI / MCP で分岐しない）
- テスト要件がパイプラインに集約され、外部プランファイルへの依存がない
- 新しいレイヤーが増えてもパイプライン側で `target_*` と `test_cases` を定義するだけで対応可能
