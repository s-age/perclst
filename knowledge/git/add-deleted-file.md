# Staging a Deleted (Moved) File with `git add`

**Type:** External

## Context

When a file has been moved or deleted on disk, the original path no longer exists. Trying to stage that deletion with the usual `git add "<path>"` command will fail because git resolves the path spec against the working tree.

## What happened / What is true

- `git add "<old-path>"` fails with `pathspec did not match any files` when the file has already been removed or moved — it no longer exists at that path.
- `git add -u "<old-path>"` stages changes to **already-tracked** files, including deletions, regardless of whether the file still exists on disk.
- When both the deleted source path and the new destination path are staged together, git automatically detects the pair as a rename.
- `rm -f` (or any shell deletion) removes the file from disk but leaves git tracking an unstaged deletion. The file will appear as a pending deletion until explicitly staged.

## Do

- Use `git add -u "<old-path>"` to stage a tracked file's deletion.
- Stage both the old (deleted) path and the new (created) path together so git records a rename instead of a delete + add.
- After deleting a directory of tracked files (e.g. `rm -f dir/*`), stage all deletions with `git add -u dir/` before committing.

## Don't

- Don't use `git add "<path>"` on a path that no longer exists on disk — it will silently do nothing or error with `pathspec did not match any files`.
- Don't assume `rm -f` is sufficient to produce a clean git state — always stage the deletions explicitly.

---

**Keywords:** git, git add, deleted file, rename, mv, pathspec, git add -u, staging, tracked file
