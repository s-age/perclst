# Procedure Resolution: cwd-first with Package Fallback

**Type:** Discovery

## Context

`ProcedureRepository` resolves procedure files by name (e.g. `meta-librarian/meta-curate-knowledge` →
`procedures/meta-librarian/meta-curate-knowledge.md`). Projects that use perclst outside its own repo need
to define custom procedures without modifying the package. This applies whenever `perclst
start --procedure <name>` is called.

## What happened / What is true

The original implementation hardcoded the lookup path to the perclst package's own
`procedures/` directory via `__dirname`, making project-local procedures impossible.

Resolution order after the fix:

1. `<workingDir>/procedures/<skill>/<name>.md` — project-local, checked first
2. `<package>/procedures/<skill>/<name>.md` — built-in fallback

`workingDir` is threaded as a method parameter on `IProcedureRepository.load()` and
`IProcedureRepository.exists()`, not as a constructor argument.

**Why method parameter, not constructor injection**: `workingDir` is session-specific data
(stored on `Session.working_dir`), not static configuration. Constructor injection would
require a new `ProcedureRepository` instance per session. A method parameter keeps the
repository stateless and DI wiring unchanged.

The only call site is `AgentDomain.run()`, which passes `session.working_dir`.

## Do

- Pass `session.working_dir` as the `workingDir` argument when calling
  `procedureRepo.load()` or `procedureRepo.exists()`
- Place custom procedures in `<project-root>/procedures/<skill>/<name>.md` to shadow or extend
  built-in ones
- Keep `ProcedureRepository` stateless; inject session-specific data via method params

## Don't

- Don't re-inject `workingDir` at DI construction time — it would couple the repository to
  a single session
- Don't assume the package `procedures/` directory is the only source of procedures

---

**Keywords:** procedure, resolution, cwd, working_dir, ProcedureRepository, project-local, fallback, method-parameter, stateless
