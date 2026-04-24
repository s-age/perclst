---
name: arch
description: Layer architecture for src/**/*.ts. Identify the layer, check import allowlist, run ts_checker. Import violations require cascading refactors.
paths:
  - 'src/**/*.ts'
user-invocable: false
---

Before writing or reviewing **any** file under `src/`, answer all three:

1. **Which layer owns this change?** — `cli` / `validators` / `services` / `domains` / `repositories` / `infrastructures` / `mcp`
2. **What may this layer import?** — check the allowlist in [`reference/layers.md`](reference/layers.md)
3. **Does this introduce a forbidden import?** — if yes, reroute before writing a single line

Do not write code if you cannot answer all three. Import-rule violations require cascading refactors.

## Import flow

```
cli ──┐
mcp ──┼→ validators → services → domains → repositories → infrastructures
     ─┘
                   types  (any layer → types, one-way)
                   core/di/setup.ts  (sole exception: wires all layers)
```

## Hard prohibitions

- `cli` or `mcp` → `repositories` / `infrastructures` — route through a service
- `services` → `repositories` / `infrastructures` — always via `domains → repositories`
- `domains` → `infrastructures` — define a port in `repositories/ports/` and inject
- Any file outside `validators/` → `zod` — Zod is confined to `validators/` only

## Verify after every change

```
ts_checker()   # lint:fix → build → test:unit; returns { ok, lint, build, test }
```

If `ok: true`, all steps passed. Otherwise inspect `errors` / `warnings` and fix before completing.

Fallback (manual order):
```bash
npm run lint:fix && npm run build && npm run test:unit
```

- Warnings are not blockers but note them
- Files auto-fixed by `lint:fix` are intentional — do not revert

## Reference files

- [`reference/layers.md`](reference/layers.md) — directory roles and per-layer import allowlists
- [`reference/stack.md`](reference/stack.md) — language, runtime, and library versions
- [`reference/coding-rules.md`](reference/coding-rules.md) — types, naming, error classes, barrel-file rule
