# Why the Context Window Shrinks on `--resume`

> **Note:** This analysis is based on the Claude Code source code and GitHub Issue status as of **2026-04-13**.
> The relevant bug (Issue [#34629](https://github.com/anthropics/claude-code/issues/34629)) was unresolved at that time; behavior may change in future versions.

## Background

When using perclst's `start` → `resume` flow, the context window usage _decreases_ by approximately **10K tokens** rather than growing as one would expect from the added conversation history. This document explains why.

---

## Observed Values

| Run                   | cache_read | cache_creation | context window |
| --------------------- | ---------- | -------------- | -------------- |
| `start` (API call 1)  | 21,531     | 8,545          | **30,086**     |
| `start` (API call 2)  | 27,637     | 3,457          | **31,102**     |
| `resume` (API call 1) | 11,899     | 7,747          | **19,649**     |
| `resume` (API call 2) | 19,646     | 227            | **19,874**     |

`context window = input_tokens + cache_read + cache_creation`

The resume's **first API call** is already 10K+ smaller than start's, even though it carries the prior conversation history.

---

## Cause 1: `skill_listing` suppression (confirmed)

On `start`, Claude Code injects a `skill_listing` attachment to inform the model of available skills:

```
[3] attachment type=skill_listing isInitial=True skillCount=6
[8] attachment type=skill_listing isInitial=False skillCount=2
```

On `--resume`, `loadConversationForResume()` loads the JSONL and calls `restoreSkillStateFromMessages()`. When that function finds an existing `skill_listing` attachment, it calls `suppressNextSkillListing()`.

**Source:** `src/utils/conversationRecovery.ts:396-400`

```typescript
if (message.attachment.type === 'skill_listing') {
  suppressNextSkillListing()
}
```

`suppressNextSkillListing()` sets a module-scoped `suppressNext` flag, disabling the next call to `getSkillListingAttachments()`. The source comment explains:

> "in the transcript the model is about to see. sentSkillNames is process-local, so without this every resume re-announces the same ~600 tokens. Fire-once latch; consumed on the first attachment pass."

**Source:** `src/utils/attachments.ts:2619-2635`

Tokens saved: **~600 tokens** (full listing suppressed — intentional optimization)

---

## Cause 2: `deferred_tools_delta` vs. full schema injection (confirmed)

Deferred tools (including all MCP tools) are identified by `isDeferredTool()`. MCP tools are unconditionally deferred:

```typescript
// src/tools/ToolSearchTool/prompt.ts:68
if (tool.isMcp === true) return true
```

Deferred tools are **not included as full schemas** in the API `tools` array. Instead, a `deferred_tools_delta` attachment announces only their names.

On resume, since the start run's JSONL contains no `deferred_tools_delta` records, the delta logic treats all 24 tools as newly added and announces them by name:

```
[15] deferred_tools_delta added=['AskUserQuestion', 'CronCreate', ..., 'mcp__perclst__ts_analyze', ...]
```

Rendering in `normalizeAttachmentForAPI` (`src/utils/messages.ts:4178-4192`):

```typescript
case 'deferred_tools_delta': {
  parts.push(
    `The following deferred tools are now available via ToolSearch:\n${attachment.addedLines.join('\n')}`,
  )
  return wrapMessagesInSystemReminder([...])
}
```

`addedLines` contains **tool names only** — no full schemas. `formatDeferredToolLine()` returns just `tool.name`.

Net effect: full schemas are not sent, but the delta itself adds ~100 tokens on resume.

---

## Cause 3: Asymmetric `messages[0]` structure (known bug — Issue #34629)

**The 600 + 100 token difference does not explain 10K. The remaining cause is analyzed in detail in [anthropics/claude-code#34629](https://github.com/anthropics/claude-code/issues/34629).**

### `messages[0]` content: new session vs. resume

Since `--resume` was introduced (v2.1.69+), `messages[0]` differs completely between session types:

|                                                 | New session (`--session-id`)                                                                                                 | Resume (`--resume`)                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `messages[0]` content                           | deferred tools list (~2.1KB) + MCP instructions (~2.2KB) + skills list (~8.6KB) + context (~306B) + user prompt ≈ **13.4KB** | context/currentDate only (~306B) ≈ **352B** |
| Position of deferred_tools_delta / MCP / skills | Inside `messages[0]`                                                                                                         | Appended at `messages[N]` (last)            |

The 13.4KB vs 352B mismatch in `messages[0]` → **cache prefix mismatch** → cache miss.

According to the issue analysis, three independent factors break the cache:

1. **`messages[0]` content asymmetry** — the 13KB vs 352B difference above
2. **`cc_version` hash in `system[0]`** — the build hash changes per invocation, causing system prompt cache misses every run
3. **`cache_control` marker position** — placed at the end of `messages[0]` on new sessions, but at `messages[last]` on resume

As conversation history grows, `cache_creation` inflates every turn, with reported costs up to **20× higher**.

### Correspondence with our observations

Start's first API call (30,086 tokens) included the 13KB `messages[0]` content. Resume's first call (19,649 tokens) had `messages[0]` shrunk to 352B — this difference accounts for most of the ~10K reduction.

### Why `cache_creation` also decreased

Resume's lower `cache_creation` is due to the simpler task (one failed Read + text response). The start run read `src/services/importService.ts` in full, producing more new cache content. This session was too short to exhibit the per-turn inflation pattern described in Issue #34629.

---

## Summary

| Factor                                   | Effect                       | Source                                                                                   |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `skill_listing` suppression              | −600 tokens                  | `conversationRecovery.ts:399`; comment: "every resume re-announces the same ~600 tokens" |
| MCP tools: names only, no full schemas   | −hundreds of tokens per tool | `isDeferredTool()`: MCP always deferred                                                  |
| `messages[0]` structural asymmetry (bug) | ~−9,000 tokens               | New session 13.4KB → resume 352B; detailed in Issue #34629                               |

---

## Implications for perclst

1. The **~30K token baseline** applies to fresh `start` runs. `resume` is structurally smaller.
2. For short tasks, the resume context window can be less than half of start's.
3. The `cache_read` decrease is currently a **known bug** (Issue #34629). The `messages[0]` asymmetry breaks the cache prefix, causing `cache_creation` to grow with each resume turn.
4. Long conversations resumed repeatedly will re-cache the full history every turn — reported to increase costs up to 20× (the core complaint of Issue #34629).

---

## Related Issues

| Issue                                                                                  | Summary                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [anthropics/claude-code#34629](https://github.com/anthropics/claude-code/issues/34629) | `--resume` changes `messages[0]` structure, breaking prompt cache. Introduced in v2.1.69 with `deferred_tools_delta`. Costs up to 20× higher reported. |
| [anthropics/claude-code#27048](https://github.com/anthropics/claude-code/issues/27048) | tool_use content not cached on resume. Sessions with heavy file reads drop cache hit rate from 99% to 17%.                                             |

---

## Source Files Referenced

| File                                        | Content                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/utils/conversationRecovery.ts:382-402` | `restoreSkillStateFromMessages` — detects `skill_listing` → calls suppression |
| `src/utils/attachments.ts:2619-2750`        | `suppressNextSkillListing` + `getSkillListingAttachments`                     |
| `src/tools/ToolSearchTool/prompt.ts:62-108` | `isDeferredTool` — MCP tools always deferred                                  |
| `src/utils/messages.ts:3728-3738`           | `skill_listing` → API message conversion                                      |
| `src/utils/messages.ts:4178-4193`           | `deferred_tools_delta` → API message conversion                               |
| `src/utils/toolSearch.ts:646-706`           | `getDeferredToolsDelta` — diff calculation logic                              |
