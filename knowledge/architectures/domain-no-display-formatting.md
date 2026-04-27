# Domain Models Must Not Pre-Format Display Strings

**Type:** Discovery

## Context

Applies to all domain classes under `src/` — any class representing a core data structure
(e.g. `CallGraphNode`). Enforced by layer rules that restrict Node.js builtins and
environment-dependent calls to utils/infrastructure layers only.

## What is true

`CallGraphNode` originally carried a `label: string` field storing a pre-formatted display
string (`path.relative(process.cwd(), filePath) + '::' + symbolName`). This violated layer
rules because it imported `path` and called `process.cwd()` inside the domain class.

**Resolution:** replace `label` with raw fields — `filePath: string | null`,
`symbolName: string | null`, `externalName?: string` — and push all formatting to the tool
layer (`src/mcp/tools/tsCallGraph.ts`).

**External node gotcha:** nodes with `kind === 'external'` have no `filePath`/`symbolName`;
they carry only `externalName`. Any `nodeLabel()` helper must check `node.kind` before
attempting `path.relative()` formatting.

## Do

- Store raw data (file paths, symbol names) in domain models
- Put `path.relative(process.cwd(), ...)` and all display/presentation logic in the tool or
  CLI layer
- Check `node.kind === 'external'` before doing path-relative formatting

## Don't

- Import `path` or call `process.cwd()` inside domain classes
- Store pre-formatted strings in domain models — they couple domain to presentation
- Assume all graph nodes have a `filePath`; external nodes use `externalName` instead

---

**Keywords:** domain layer, display formatting, CallGraphNode, path.relative, layer rules, externalName, filePath, symbolName, MCP tools, layering
