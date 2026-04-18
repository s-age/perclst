# TsAnalyzer: private/protected フィルタリングは infra 層に置く

## Decision

`TsAnalyzer.extractSymbols()` でクラスメソッドを `PrivateKeyword` / `ProtectedKeyword` でフィルタリングしているが、これは **infra 層に置いたまま**でよい。

## Why

「private を除外する」という判断は一見ビジネスルールに見えるが、実体は ts-morph の AST プロパティを読むだけの操作（`hasModifier(SyntaxKind.PrivateKeyword)`）。
domain に移すには「フィルタ前の raw 型」を新設する必要があり、型の複雑さが増す割に得られるものが薄い。

testStrategy パターンと比較すると差が明確：
- testStrategy infra: `branchCount` / `loopCount` などの **数値** を返す（解釈なし）
- testStrategy domain: `complexity = 1 + branchCount + ...` という **計算式** を持つ

ts_analyze には「数値を解釈する計算式」相当のドメインルールが現状ない。
将来「public API のみ表示する条件を設定で変えたい」などの要件が生まれた時点で domain に移す。

## How to apply

ts_analyze 系を拡張する際、フィルタロジックを domain に移したくなったら「raw 型が必要か」を先に確認する。
必要でなければ infra に置き続ける。
