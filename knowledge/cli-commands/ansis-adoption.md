# ansis + cli-table3: Replacing Hand-Written ANSI Codes

**Type:** External

## Context

Applies when working on the display / colour layer (`src/utils/display.ts`,
`src/constants/`) or adding new table-formatted output to CLI commands.

## What happened / What is true

The codebase previously used:

- `src/constants/ansi.ts` — four hand-coded ANSI escape sequences.
- `display.ts:hexToAnsi()` — a manual hex-to-ANSI-256 converter.

Both were removed and replaced with the `ansis` library:

| Old | New (ansis) |
|-----|------------|
| hand-written reset/dim codes | `dim()` |
| custom `hexToAnsi(hex)` | `hex(color)` |
| manual bg colour escape | `bgAnsi256(n)` |
| manual bright-white escape | `whiteBright` |

`cli-table3` was added to render `list` and `analyze` command output as aligned
tables instead of manual string padding.

### NO_COLOR behaviour

- `ansis` natively honours the `NO_COLOR` environment variable — colours are
  stripped automatically when `NO_COLOR=1` is set.
- `displayConfig.no_color` still performs a manual check alongside ansis; both
  mechanisms are active.

## Do

- Use `ansis` helpers (`hex()`, `dim()`, `bgAnsi256()`, etc.) for all colour output.
- Rely on `ansis`'s built-in `NO_COLOR` support; no need to strip codes manually.
- Use `cli-table3` for any multi-column tabular output in CLI commands.

## Don't

- Don't write raw ANSI escape sequences (`\x1b[…m`) anywhere in the codebase.
- Don't reintroduce a custom `hexToAnsi` function — `ansis.hex()` covers it.
- Don't assume `displayConfig.no_color` alone is sufficient — the env var path goes
  through `ansis` independently.

---

**Keywords:** ansis, cli-table3, ANSI, colour, NO_COLOR, hex, dim, table, display, escape codes
