# Claude Code JSONL: Separate Entries per Assistant Block Type

**Type:** External

## Context

When parsing Claude Code session JSONL files (`.claude/projects/.../session.jsonl`),
each logical model turn is stored as multiple consecutive JSONL lines, not as a single
entry with mixed content blocks. This affects any code that counts or groups assistant
turns.

## What happened / What is true

Claude Code emits thinking, text, and tool_use as **separate** assistant JSONL entries.
A typical logical turn looks like:

```
assistant: ['thinking']    ← model reasoning
assistant: ['text']        ← optional preamble ("Let me check…")
assistant: ['tool_use']    ← actual tool call
user:      ['tool_result']
```

This differs from the Claude API spec, where a single response can contain mixed
content blocks in one message object.

**Consequence:** Treating each JSONL assistant entry as an independent turn inflates
turn counts (e.g. 20 instead of 13 for a 13-tool session).

**Fix pattern:** Buffer consecutive assistant entries and flush them as one logical turn
when a `user` entry (or EOF) is encountered (`buildTurns` approach).

## Do

- Buffer all consecutive assistant JSONL entries before processing them as a single logical turn
- Extract thinking blocks manually from each raw entry's `content` array before calling
  any function that filters or transforms assistant entries
- Flush the buffer on every `user` entry or at EOF

## Don't

- Don't treat each JSONL assistant line as an independent conversation turn
- Don't rely on a transform function (e.g. `processAssistantEntry`) to preserve thinking
  blocks — if it filters thinking-only entries it returns `null`, silently dropping content

## Thinking-only entry gotcha

`processAssistantEntry` returns `null` for thinking-only entries (all-thinking filter).
When merging a group, extract thinking **before** calling the transform:

```typescript
for (const block of e.message.content ?? []) {
  if (block.type === 'thinking') acc.thinking.push(block.thinking)
}
const result = processAssistantEntry(e, toolResultMap) // may return null
```

---

**Keywords:** jsonl, claude-code, session, assistant entries, thinking, tool_use, turn counting, buildTurns, processAssistantEntry, null, buffering
