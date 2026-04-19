# Service Layer Must Not Call fs Operations Directly

**Type:** Problem

## Context

In `src/services/pipelineService.ts`, the rejection-handling methods
(`handleAgentRejection`, `handleScriptRejection`) originally contained direct
calls to `fs.existsSync`, `fs.readFileSync`, and `fs.unlinkSync` to check for
and read rejection-feedback files. This is an architecture-layer violation in
this codebase.

## What happened / What is true

- The service layer is only allowed to call domain ports and coordinate state —
  it must not reach into the filesystem directly.
- File I/O (`existsSync`, `readFileSync`, `unlinkSync`) on rejection-feedback
  paths is infrastructure-level work and belongs in a repository.
- The fix: two new methods were added to `IPipelineDomain` (the domain port):
  - `getRejectionFeedback(name)` — checks for and reads the feedback file
  - `getWorkingDirectory(name)` — returns the working directory path
- A dedicated repository `src/repositories/rejectionFeedback.ts` was created to
  hold the actual `fs` calls behind those port methods.
- `PipelineService` now calls `domain.getRejectionFeedback(name)` instead of
  touching the filesystem, keeping the layer boundary clean.

## Do

- Add filesystem operations to a repository under `src/repositories/`.
- Expose access via a method on the domain port (`IPipelineDomain`).
- Keep `PipelineService` calling only domain port methods — no `fs` imports.

## Don't

- Don't import `fs` in the service layer for reading/writing operational files.
- Don't inline path-resolution or file-existence checks in service methods.

---

**Keywords:** service layer, fs operations, existsSync, readFileSync, unlinkSync, repository, domain port, getRejectionFeedback, rejectionFeedback, architecture violation, layer boundary
