# execSync with User-Supplied Git Refs Is Vulnerable to Shell Injection

**Type:** Problem

## Context

Applies whenever user-supplied values (branch names, commit SHAs, tags) are
interpolated into shell commands executed via `execSync`. In perclst this surfaces
in `getDiff` inside the infrastructure layer, which calls `execGitSync` with
`from`/`to` arguments sourced from CLI input.

## What happened / What is true

Template-literal shell invocation like:

```ts
execSync(`git diff ${from} ${to}`)
```

passes the string directly to `/bin/sh`. A ref value such as `main; rm -rf ~`
causes the injected command to execute with the same privileges as the process.

**Fix applied:** an allowlist validator (`gitRefRule()`) was added in
`src/validators/rules/gitRef.ts` and wired into `inspectSession.ts` before the
value reaches the infrastructure layer. The pattern `/^[a-zA-Z0-9._\-/]+$/` covers
branch names, tag names, and commit SHAs while rejecting all shell metacharacters.

**Alternative:** `execFileSync` with an args array avoids the shell entirely, but
requires restructuring `execGitSync` (currently takes a single string). The validator
approach is lower blast-radius when only one call site is affected.

## Do

- Validate all user-supplied git refs against `/^[a-zA-Z0-9._\-/]+$/` before passing
  them to any shell command
- Use `execFileSync` with an args array for new call sites to avoid the shell entirely

## Don't

- Don't interpolate user input directly into template-literal shell strings
- Don't assume branch names are safe — they can contain arbitrary characters

---

**Keywords:** execSync, shell injection, git ref, security, allowlist, execFileSync, getDiff, infrastructure
