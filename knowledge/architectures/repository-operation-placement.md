# Repository Operation Placement

**Type:** Problem

## Context

When adding a new operation that co-occurs with another repository call at the call site, there is
a temptation to add the new method to whichever repository is already in scope — even when the
operation belongs to a different concern. This typically appears during refactors where multiple
systems are touched in one pass.

## What happened / What is true

`removeGlob` (implemented as `rm -f <pattern>`) was placed on `IGitRepository` because it was
needed immediately after pipeline moves that also involved git operations. Shell file deletion is
not a git concept. The correct home was `IPipelineFileRepository`, implemented via Node.js `fs`
rather than shell invocation.

Consequences of the misplacement:
- `IGitRepository` grew a method that had no semantic connection to git
- The shell invocation (`rm -f`) mixed infrastructure concerns inside a git-oriented class
- Tests for git operations had to account for unrelated file-system behavior

## Do

- Ask "what domain concept does this method belong to?" — assign based on that, not call-site
  proximity
- Implement file-system operations (create, delete, move) in file-oriented repositories
- Use `fs` (Node.js) for file operations; reserve shell invocations for operations that have no
  `fs` equivalent

## Don't

- Add a method to a repository just because it is called near another method of that repository
- Put shell file-deletion (`rm -f`) inside a git-oriented repository
- Let call-site convenience drive interface design

---

**Keywords:** repository, operation placement, IGitRepository, file system, fs, shell, DIP, layered architecture, interface design
