# `retrieve` Does Not Expose `--output-only` as a CLI Flag

**Type:** Problem

## Context

Applies when calling `perclst retrieve` from an agent or script. The `--output-only`
flag is available on `start` and `resume`, which causes agents to assume it works on
every subcommand.

## What happened / What is true

Running `perclst retrieve "kw" --output-only` fails with:

```
error: unknown option '--output-only'
```

`retrieve` calls `startCommand` internally with `outputOnly: true` hardcoded — it
always suppresses extra output. The flag is not exposed on the CLI because it has no
alternative: retrieve is always output-only by design.

## Do

- Call `perclst retrieve "kw1" "kw2"` with no extra flags — output is already clean
- Trust that retrieve output is agent-safe without any additional flag

## Don't

- Don't pass `--output-only` to `retrieve` — it will error
- Don't assume flags available on `start`/`resume` are available on all subcommands

---

**Keywords:** retrieve, output-only, unknown option, CLI flag, gotcha, agent invocation
