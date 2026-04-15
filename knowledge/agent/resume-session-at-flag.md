# Claude Code `--resume-session-at` and JSONL UUID

**Type:** External

## Context

When implementing rewind or fork features in perclst, these two Claude Code
behaviors must be understood together: the `--resume-session-at` flag and
the `uuid` field structure in JSONL session files.

## What happened / What is true

**`--resume-session-at <uuid>`**
- Loads history up to and *including* the assistant message with that UUID
- Messages after that UUID are ignored
- The flag alone does **not** create a new session

**`--fork-session`**
- Creates a new session (new session ID) without modifying the source
- Must be combined with `--resume-session-at` to control how much history
  is loaded into the fork

**Correct combined invocation:**
```bash
claude -p --resume <source-id> --fork-session --session-id <new-id> \
       --resume-session-at <msg-uuid>
```

**JSONL UUID field**
- Each line in a Claude Code JSONL file has a top-level `uuid` field,
  *outside* the `message` object:
  ```json
  { "type": "assistant", "uuid": "...", "message": { "content": [...] } }
  ```
- `--resume-session-at` expects this top-level `uuid`, not any UUID that
  appears inside `message.content` blocks.

## Do

- Always pair `--fork-session` with `--resume-session-at` when rewinding
- Read the top-level `uuid` from JSONL lines when building the argument

## Don't

- Don't pass `--resume-session-at` without `--fork-session` if you want a
  new session — it will silently truncate history in the existing session
- Don't use a UUID from inside `message.content` blocks as the argument

---

**Keywords:** resume-session-at, fork-session, JSONL, uuid, rewind, claude CLI, session fork, history truncation
