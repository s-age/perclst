# Integration test design decisions

## ts_test_strategist は integration test で使わない

`ts_test_strategist` はソースの cyclomatic complexity からモック戦略を導くが、
integration test ではこれが逆効果になる。

- strategist の `suggested_mocks` はサービス層（`SessionService` 等）を `vi.fn()` で
  差し替えるよう提案する → integration test の目的（DI スタック全体を通す）を壊す
- `expected_test_file_path` が `__tests__/<cmd>.test.ts` を指し、
  `integration/<cmd>.integration.test.ts` にならない

integration test での「何をテストするか」は `plans/` の計画書が担う。
procedure 側で明示的に「strategist を呼ばない」と記載すること。

## setupContainer のシングルトン汚染と 1-file-per-worker 制約

`setupContainer` は DI コンテナのシングルトンを上書きする。
Vitest がワーカーをファイル間で共有した場合（`--singleThread` や `--pool=vmThreads`）、
あるテストファイルの `setupContainer` 呼び出しが別ファイルのテストに影響する。

対策: デフォルトの `isolate: true` を維持し、1ファイル = 1 Vitest worker を保証する。
integration test の procedure / 計画書に明記しておく。

## ts_call_graph は integration test で使わない

integration test のモック境界は **infra 層のみ**（`claudeCodeInfra` = `claude -p` サブプロセス）
であり、それ以外（`SessionService`、`AgentService` 等）は実ファイルシステム上で全て実走する。
外部 I/O（実際の Claude CLI 呼び出し）だけを差し替えるのがこの層の設計。

この境界は固定・既知であるため、コールグラフ分析で発見するものではない。
「Pure（エージェント呼び出しなし）か Agent-wrapping か」の分類ステップがその判断を担っており、
`ts_call_graph` を呼んでも新たな情報は得られない。

`ts_call_graph` は「何をモックするか」を見つけるツールとして設計されており、
その用途自体が integration test（モック境界が既知・固定）と噛み合わない。
procedure に明示的に禁止を記載すること。

## plans/ と procedures/ の役割分担

- `plans/<slug>.md` — **何をテストするか**（テストケース仕様、対象コマンドのリスト）
- `procedures/test-integration/implement.md` — **どう書くか**（agent のフロー、コード規約）

計画書は仕様書として残し、手順の詳細は procedure に委ねる。
計画書の冒頭に `--procedure test-integration/implement` の起動コマンドを記載して連携させる。
