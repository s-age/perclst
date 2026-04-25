# git_pending_changes Includes Staged + Unstaged + Untracked

**Type:** Discovery

## Context

The `git_pending_changes` MCP tool is used by reviewer agents to obtain all uncommitted changes
before a commit or PR review. Its scope was intentionally expanded beyond the initial "unstaged only"
spec to capture the complete working-tree state.

## What happened / What is true

- Initial spec was "unstaged files only" (`git diff` + untracked listing).
- Scope was changed to also include staged changes (`git diff --cached`).
- Rationale: reviewer agents need a complete picture of all uncommitted work; excluding staged
  changes would miss `git add`-ed modifications and newly staged files, making any "complete
  picture" claim false.
- The tool now combines three sources:
  1. `git diff --cached` — staged changes to tracked files
  2. `git diff` — unstaged changes to tracked files
  3. `git ls-files --others --exclude-standard` piped through
     `git diff --no-index /dev/null <file>` — untracked new files

## Do

- Treat `git_pending_changes` output as the union of all three sources above.
- When adding new diff-collection logic, preserve all three sources so reviewers see everything.

## Don't

- Don't reduce the tool back to unstaged-only — staged files would disappear from reviews.
- Don't assume `git diff` alone is sufficient; untracked files require the `--no-index` path.

---

**Keywords:** git_pending_changes, mcp, reviewer, staged, unstaged, untracked, design decision, git diff cached
