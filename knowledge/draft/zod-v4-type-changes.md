# Zod v4 型変更による validators エラーパターン

## 発生状況

Zod v3 → v4 アップグレード後、`src/validators/rules/` で以下のエラーが発生した。

## 具体的な変化

### `z.coerce.number()` の戻り値型

- v3: `ZodNumber`
- v4: `ZodCoercedNumber`（`ZodCoercedNumber extends _ZodNumber` だが `ZodNumber` とは別型）

`intRule(): z.ZodNumber` のような明示的な戻り値型注釈は v4 で型エラーになる。

### `z.ZodBoolean`・`z.ZodString` の strict 化

v4 では `_ZodBoolean`・`_ZodString` などの内部型が公開されており、テストモックで `{}` や partial object を `ZodBoolean`/`ZodString` として渡すと型エラーになる。

## 修正パターン

### プロダクションコード：ReturnType か z.ZodXxx を使う

```ts
// 安全な書き方（v4 の具体型を使う）
export function booleanRule(): z.ZodBoolean { return z.boolean() }
export function stringRule(): z.ZodString { ... }

// coerce は ZodCoercedNumber が返るため ReturnType を使う
type IntSchema = ReturnType<ReturnType<typeof z.coerce.number>['int']>
export function intRule(): IntSchema { ... }
```

`ReturnType<typeof z.string>` は **使わない**。`z.string` にジェネリックオーバーロードがあり、`$ZodType<string, string, ...>` という基底型に推論されてしまい、呼び出し側で `.optional()` などが見つからなくなる。

### テストコード：`unknown as ReturnType<typeof z.xxx>` でキャスト

```ts
// Bad: as any（カスタム local/no-any ルールで禁止）
vi.mocked(z.boolean).mockReturnValue({} as any)

// Good: unknown 経由でキャスト
const mock = {} as unknown as ReturnType<typeof z.boolean>
vi.mocked(z.boolean).mockReturnValue(mock)
```

### テストコード：`this` を使う mock は arrow function + closure に置き換え

```ts
// Bad（TS2683: this implicitly any）
const mockFn = vi.fn(function () { return this })

// Good
const result = { min: vi.fn(), max: vi.fn() }
result.min.mockReturnValue(result)
result.max.mockReturnValue(result)
```

## 注意点

- `vi.clearAllMocks()` は呼び出し履歴のみクリア。`mockReturnValue` の実装は維持される（`vi.resetAllMocks()` でリセット）。
- カスタム ESLint ルール `local/no-any` は `@typescript-eslint/no-explicit-any` を off にした上で独自実装。disable コメントは `eslint-disable-next-line local/no-any` を使う（`@typescript-eslint/no-explicit-any` では効かない）。
