---
name: arch-repositories
description: "Required for any work in src/repositories/. Covers dual export, port type placement, atomic operations, and stream-parse patterns."
paths:
  - 'src/repositories/**/*.ts'
---

Wraps infrastructure adapters into atomic, domain-meaningful operations. Never exposes raw Node.js I/O — all I/O flows through `infrastructures/`. Owns response shaping: raw infrastructure output (stdout lines, ts-morph handles, raw bytes) is converted to typed domain values here, never inside `infrastructures/`.

## Directory layout

```
repositories/
├── *.ts           # Implementations — class (+ optional standalone functions) per domain area
├── ports/         # IXxx port contracts consumed by domains/; never defined elsewhere
└── parsers/       # Pure format-specific parsing helpers; no I/O allowed
```

## Import Rules

| May import | Must NOT import |
|-----------|----------------|
| `repositories/ports` (intra), `repositories/parsers` (intra), `infrastructures`, `types`, `errors`, `utils`, `constants` | `cli`, `services`, `domains` |

## Patterns

**Dual export** — class wraps standalone functions so callers can use either form; the standalone function is the unit of logic, the class a thin adapter. When there is no injected state (e.g. `config.ts`), export standalone functions only — no class.

**Port type placement** — every `IXxx` interface lives in `src/repositories/ports/`, never in the implementation file. Import it with `import type { IXxx } from '@src/repositories/ports/...'`.

**Incremental stream parse** — consume an `AsyncGenerator` from infrastructure by maintaining a running parse state (`createParseState` / `processLine` / `finalizeParseState`). Never buffer all lines in a `string[]` before parsing; that causes unbounded memory growth for long-running streams.

**Extend `fs.ts` before bypassing it** — `infrastructures/fs.ts` exposes JSON/text helpers (`readJson`, `writeJson`, `readText`, `fileExists`, `ensureDir`, etc.). If it lacks an operation you need, add it there first rather than importing `readFileSync` directly in a repository file.

See `examples/patterns.md` for annotated Good/Bad code for each pattern above.

## Prohibitions

- Never import from `cli`, `services`, or `domains`
- Never call raw Node.js `fs` functions when `infrastructures/fs` provides the equivalent; extend `fs.ts` first if the operation is missing
- Never add business logic (validation, branching on domain rules, cross-entity orchestration) — keep every exported function atomic and mechanical
- Never instantiate a domain class — dependency flows downward only
- Never define a port type (`IXxx`) in a repository implementation file — port types belong in `src/repositories/ports/`
- Never import from sibling repository implementation files — shared utilities belong in `utils/` or `constants/`; parsing helpers belong in `parsers/`
- Never shape data inside `infrastructures/` — collect raw output here and convert it in a `parsers/` file
