# `moveToDone` Returns a Path Relative to Its Own Root, Not cwd

**Type:** Problem

## Context

When staging pipeline file moves with `git add`, paths returned by `moveToDone` are
relative to the pipeline directory (e.g. `done/review-fix/...`), not to the process's
current working directory. Passing these directly to shell commands like `git add` or
`fs.rename` will silently fail or throw.

## What happened / What is true

- `moveToDone()` returns `donePath` as a relative path such as `done/review-fix/<file>`.
- This path lacks the `pipelines/` prefix, so it is **not** relative to `process.cwd()`.
- Passing `donePath` directly to `git add "<donePath>"` causes git to error with
  `pathspec did not match any files`.
- The same problem occurs for the original (source) path if it was built from a relative root.

## Do

- `resolve()` both the source and destination paths to absolute paths before passing them
  to `git add`, `fs.rename`, or any shell command.
- Derive absolute paths from a known absolute anchor (e.g. the pipeline file's directory)
  rather than assuming they are cwd-relative.

## Don't

- Don't pass `moveToDone`'s return value directly to `git add` without resolving it first.
- Don't assume any path returned by a domain helper is relative to `process.cwd()`.

---

**Keywords:** moveToDone, donePath, relative path, absolute path, resolve, git add, pathspec, pipeline, commitMovedPipeline
