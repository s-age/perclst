# Utils Layer: I/O Modules Are Forbidden

**Type:** Discovery

## Context

Applies whenever adding a new helper module to `src/utils/`. The utils layer has strict purity constraints that ban any module performing I/O — even Node.js built-ins.

## What happened / What is true

`src/utils/` is restricted to pure functions and library wrappers. Node.js built-ins are allowed only if they perform **no I/O** (e.g. `crypto`, `path`). Modules such as `readline`, `fs`, and `net` perform I/O and violate the layer boundary.

The rule was confirmed when `confirm()` (which internally uses `readline.createInterface`) was placed in `src/utils/prompt.ts` and caught as a layer violation during code inspection.

When a helper requires stdin/stdout/stderr, the correct placement is:

- `src/cli/helper.ts` — CLI-specific I/O (e.g. interactive prompts like `confirm()`)
- `src/infrastructures/` — infrastructure-level I/O exposed via a port

## Do

- Place pure functions and non-I/O library wrappers in `src/utils/`
- Use `crypto` or `path` freely inside `src/utils/` — they do no I/O
- Move any stdin/stdout/stderr logic to `src/cli/helper.ts` or `src/infrastructures/`

## Don't

- Import `readline`, `fs`, `net`, or any other I/O module into `src/utils/`
- Add interactive prompts or file operations under `src/utils/`

---

**Keywords:** utils, layer, I/O, readline, fs, pure functions, architecture, layer violation, confirm, prompt, infrastructures
