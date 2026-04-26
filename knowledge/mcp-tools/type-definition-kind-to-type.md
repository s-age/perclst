# `TypeDefinition.kind` Field Renamed to `TypeDefinition.type`

**Type:** Discovery

## Context

Applies to any code or test that constructs or inspects `TypeDefinition` objects from
`src/types/tsAnalysis.ts`. The field rename also coincided with several other fields
becoming required.

## What happened / What is true

The `TypeDefinition` type no longer has a `kind` field. It is now `type`:

```ts
export type TypeDefinition = {
  name: string
  type: string          // ← was previously `kind`
  properties?: PropertyInfo[]
  methods?: MethodInfo[]
  parameters?: ParameterInfo[]
  returnType?: string
}
```

Object literals that still use `kind: '...'` get:

```
TS2353: Object literal may only specify known properties,
        and 'kind' does not exist in type 'TypeDefinition'
```

**Other fields that became required at the same time:**

| Type | Field | Change |
|---|---|---|
| `ReferenceInfo` | `snippet` | now required (was optional) |
| `TypeScriptAnalysis` | `file_path` | now required |
| `RawOutput` | `message_count` | now required |

Test fixtures that omit these fields will fail type-checking and must be updated.

## Do

- Replace `kind: '...'` with `type: '...'` in all `TypeDefinition` literals
- Add the missing required fields (`snippet`, `file_path`, `message_count`) in test fixtures

## Don't

- Assume `kind` is still a valid field on `TypeDefinition`
- Omit newly required fields in object literals used in tests

---

**Keywords:** TypeDefinition, tsAnalysis, kind, type, ReferenceInfo, snippet, TypeScriptAnalysis, file_path, RawOutput, message_count, TS2353, required fields
