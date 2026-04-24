Planning を 3 エージェントのパイプラインで実現するアーキテクチャ。

## パイプライン構成

```
meta-plan  →  code-base-survey  →  create-planning-pipeline
```

## 各エージェントの役割と入出力

| Agent | Procedure | Input | Output |
|-------|-----------|-------|--------|
| meta-plan | `meta-plan.md` | feature description | `plans/<slug>/` ディレクトリ |
| code-base-survey | `code-base-survey.md` | `plans/<slug>/layers.md` + `<layer>.md` | `plans/<slug>/gotchas.md`、layer ファイルの補正 |
| create-planning-pipeline | `create-planning-pipeline.md` | `plans/<slug>/layers.md` + `<layer>.md` + `gotchas.md` | `pipelines/implement__<slug>.json` |

## plans/<slug>/ のファイル構成

```
plans/<slug>/
  brief.md      目標・設計決定（meta-plan が生成）
  layers.md     レイヤーマニフェスト（create-planning-pipeline のルーティング用）
  <layer>.md    レイヤーごとの仕様（meta-plan が骨格作成、code-base-survey が補正）
  gotchas.md    注意点・再利用候補（code-base-survey が生成）
```

## 設計の核心

**I/F 設計が最大の目的**。`<layer>.md` はインターフェース定義（型シグネチャ、ポートメソッド）を先頭に書き、コードスケッチはその後に置く。I/F の正確性がマルチエージェント実行の成否を決める。

`layers.md` は `create-planning-pipeline` エージェントへのルーティングマニフェストであり、どのレイヤーファイルが存在するかを示す。実装順は `errors → types → infrastructures → repositories → domains → services → validators → cli`。

## 旧方式との違い

旧 `plan-feature.md`（現在は `meta-plan.md` にリネーム）は 1 エージェントが survey・design・pipeline 生成をすべて行い、結果を 1 ファイルに追記していた。新方式ではエージェントとファイルを分離することで、各エージェントが必要なファイルだけを読めるようになった。
