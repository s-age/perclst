# Sweep Command: `--force` or `--dry-run` Required for Open-Ended Ranges

**Type:** Discovery

## Context

The `sweep` command deletes sessions within a date range. When `--to` is omitted, the
range extends to *now* — a potentially destructive footgun. The validator enforces an
explicit confirmation in this case.

## What is true

If `to` is omitted, the validator requires **either**:
- `--force` — confirms deletion intent, OR
- `--dry-run` — previews matches without deleting.

Omitting both flags triggers:
> `--to is omitted (open-ended range up to now): add --force to confirm, or use --dry-run to preview`

## Do

```ts
// Delete with explicit confirmation
await sweepCommand({ from: '2026-01-01', force: true })

// Preview only
await sweepCommand({ from: '2026-01-01', dryRun: true })
```

- In tests, include at least one of these flags whenever `--to` is omitted.
- Use the no-flag case as an **error-path** test (validation failure is expected).

## Don't

- Omit both `--force` and `--dry-run` when `--to` is absent and expect success.
- Treat this as a bug — the gate is intentional.

---

**Keywords:** sweep command, force, dry-run, open-ended range, validation, date range, safety gate
