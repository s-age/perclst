# ansis v4: bgAnsi256 / ansi256 Methods Removed

**Type:** External

## Context

Applies whenever the `ansis` package is used for terminal colour output in Node.js projects.
The `ansi256` and `bgAnsi256` methods were available in v3 but were removed in v4.
Because `tsup`/`esbuild` bundles without running full TypeScript type-checks, the error
only surfaces at runtime — not during `npm run build`.

## What happened / What is true

- `ansis.bgAnsi256(n)` and `ansis.ansi256(n)` no longer exist in ansis v4.
- TypeScript types for these methods are also absent, but `esbuild` (used by tsup) skips
  type-checking, so the build succeeds and the error is a runtime `TypeError`.
- Equivalent replacements use the RGB API: `bgAnsi256(238)` → `bgRgb(68, 68, 68)`
  (palette index 238 ≈ dark grey `#444444`).

### Colour APIs available in ansis v4

| API | Example |
|-----|---------|
| Hex | `hex('#D97757')` / `bgHex('#D97757')` |
| RGB | `rgb(r, g, b)` / `bgRgb(r, g, b)` |
| Named | `red`, `bgBlue`, `whiteBright`, `bgGray`, … |

## Do

- Use `bgHex('#RRGGBB')` or `bgRgb(r, g, b)` for custom background colours.
- Look up the RGB equivalent when migrating from a 256-colour palette index.

## Don't

- Don't call `ansi256()` or `bgAnsi256()` — they were removed in v4 and will throw at runtime.
- Don't rely on a clean build as proof that colour APIs work; run the CLI to verify.

---

**Keywords:** ansis, v4, bgAnsi256, ansi256, terminal color, 256-color palette, bgRgb, runtime error, tsup, esbuild
