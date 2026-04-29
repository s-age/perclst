# ts-morph: getType().getText() vs getTypeNode()?.getText()

**Type:** External

## Context

Applies whenever ts-morph is used to extract human-readable type strings from declarations — for example, when building MCP tools that emit parameter types or return types for display or tool output (e.g. `ts_analyze`).

## What happened / What is true

- `getType().getText()` returns the **compiler-resolved** type as a fully-qualified string, including absolute import paths:
  ```
  import("/Users/s-age/gitrepos/perclst/src/domains/ports/session").ISessionDomain
  ```
  This is unreadable and unusable for display purposes.

- `getTypeNode()?.getText()` returns the **source-written** type annotation exactly as it appears in the code:
  ```
  ISessionDomain
  ```

- `getTypeNode()` returns `undefined` when there is no explicit type annotation (inferred types). The safe fallback pattern is:
  ```ts
  p.getTypeNode()?.getText() ?? p.getType().getText()
  ```

- Applies to all declaration kinds that carry a type annotation:
  - `ParameterDeclaration.getTypeNode()`
  - `MethodDeclaration.getReturnTypeNode()`
  - `FunctionDeclaration.getReturnTypeNode()`
  - `PropertyDeclaration.getTypeNode()`
  - `TypeAliasDeclaration.getTypeNode()`

## Do

- Use `getTypeNode()?.getText() ?? getType().getText()` to get a clean, readable type string
- Prefer `getTypeNode()` for all display or tool-output contexts

## Don't

- Don't use `getType().getText()` alone — it emits fully-qualified compiler paths that break output readability
- Don't assume `getTypeNode()` is always defined; always guard with `?.` and provide a fallback

---

**Keywords:** ts-morph, getType, getTypeNode, getText, type annotation, fully-qualified, resolved type, parameter type, return type, MCP tools, ts_analyze
