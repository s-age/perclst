# Use spawnGitSync (not execGitSync) When Passing Pathspecs

**Type:** Problem

## Context

When invoking git commands that include pathspec arguments (e.g. `*.ts`), the choice
between `execGitSync` and `spawnGitSync` determines whether the shell expands globs
before git sees them. This matters anywhere in the codebase that calls git with
wildcard path patterns.

## What happened / What is true

`execGitSync` uses `execSync` under the hood, which runs the command through a shell.
The shell expands `*.ts` against the **current working directory** before git receives
the argument:

- If `.ts` files exist in the CWD → they are substituted in, sending unintended paths to git.
- If no `.ts` files exist in the CWD → `*.ts` is passed through unchanged (environment-dependent behaviour).

`spawnGitSync` uses `spawnSync`, which passes arguments directly to the git process
with **no shell involved**. Git receives `*.ts` literally and applies its own pathspec
matching, which (for patterns without `/`) matches against the filename portion only —
so `*.ts` correctly picks up `src/foo.ts`, `lib/bar.ts`, etc.

```ts
// Bad — shell expands *.ts against CWD before git sees it
execGitSync('diff --cached -- *.ts', cwd)

// Good — *.ts is passed verbatim to git
spawnGitSync(['diff', '--cached', '--', '*.ts'], cwd)
```

## Do

- Use `spawnGitSync(args: string[], cwd)` whenever args include pathspec patterns.
- Pass each argument as a separate array element to avoid any shell interpretation.

## Don't

- Don't use `execGitSync` with pathspec globs — shell expansion makes results
  environment-dependent and hard to debug.
- Don't rely on "no matching files in CWD" as a workaround; it is fragile.

---

**Keywords:** spawnGitSync, execGitSync, pathspec, glob expansion, shell, spawnSync, execSync, wildcard, *.ts
