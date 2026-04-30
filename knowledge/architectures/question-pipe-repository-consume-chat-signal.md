# consumeChatSignal Belongs in QuestionPipeRepository

**Type:** Discovery

## Context

The CLI needs to detect whether an agent run ended with a chat-signal — a temp
file at `$TMPDIR/perclst-chat-<sessionId>` that tells the CLI to drop into
interactive chat. A consumer method (`consumeChatSignal`) must read and delete
that file.

## What happened / What is true

`QuestionPipeRepository` already owns `writeChatSignal()`, the write-side of
the same temp file. `consumeChatSignal(sessionId)` — the read-and-delete side
— belongs in the same repository because:

- Both sides reference the same `$TMPDIR/perclst-chat-<sessionId>` path. Keeping
  them together avoids duplicating the path string across files.
- File-based IPC protocols should have both ends in one place to preserve
  symmetry and make the protocol easy to reason about.

The method propagates up through the standard stack:

```
IQuestionPipeRepository
  → IQuestionPipeDomain
  → QuestionPipeDomain
  → QuestionPipeService
```

CLI commands resolve `QuestionPipeService` from DI and call `consumeChatSignal`
there.

## Do

- Add both sides of a file-based IPC signal to the same repository class.
- Follow the full interface → domain → service chain when adding new repository
  methods.

## Don't

- Don't create a separate `ChatSignalRepository` just for the consume side.
- Don't call `fs` directly in CLI command handlers — route through the service
  layer.

---

**Keywords:** consumeChatSignal, QuestionPipeRepository, chat signal, IPC, tmpdir, file-based IPC, repository placement, writeChatSignal
