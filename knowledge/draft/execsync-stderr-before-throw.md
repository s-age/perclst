# execSync は throw より先に stderr を出力する

## 問題

Node.js の `execSync` は、コマンドが非ゼロで終了した場合に stderr をターミナルに書き出してから例外を throw する。
そのため、呼び出し側で `try/catch` しても stderr の出力は止められない。

```typescript
// これでは "error: pathspec '...' did not match any file(s)" がターミナルに出る
try {
  execSync('git add -u ".claude/tmp/"')
} catch {
  // 例外は握りつぶせるが stderr は既に出力済み
}
```

## 対処パターン

実行前に前提条件を確認してから呼ぶ。

```typescript
if (this.gitRepo.hasTrackedFiles('.claude/tmp/')) {
  try {
    this.gitRepo.stageUpdated('.claude/tmp/')
  } catch {
    // 本当に予期しない失敗のみここに来る
  }
}
```

`spawnSync` は stderr をキャプチャして throw しないので、エラー出力を完全に抑制したい場合の代替にもなる（ただし戻り値のチェックが必要）。

## 発生箇所

`gitRepository.ts` の `stageUpdated('.claude/tmp/')` — `.claude/tmp/` に追跡ファイルが存在しない環境で pipeline の `commitMove` を実行すると表面化していた。
