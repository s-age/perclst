# skill scripts で CommonJS を使う場合は .cjs 拡張子が必要

## 問題

`package.json` に `"type": "module"` が設定されているプロジェクトでは、`.js` ファイルが ES Module として扱われる。
スキルの `scripts/` に `require()` を使う Node.js スクリプトを `.js` で置くと実行時に以下のエラーになる：

```
ReferenceError: require is not defined in ES module scope
```

## 対処

CommonJS 構文（`require`）を使う skill スクリプトは `.cjs` 拡張子にする。

```
.claude/skills/my-skill/scripts/
├── validate-schema.cjs   ← .cjs で CommonJS 強制
└── validate-name.sh
```

## 参照方法

SKILL.md からは `${CLAUDE_SKILL_DIR}` 変数で絶対パスを解決する：

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-schema.cjs pipelines/<name>.yaml
bash ${CLAUDE_SKILL_DIR}/scripts/validate-name.sh pipelines/<name>.yaml
```

`${CLAUDE_SKILL_DIR}` はスキルのディレクトリに展開されるため、作業ディレクトリに依存しない。
