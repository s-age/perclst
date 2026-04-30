# chat Command: --model and --effort Are Persisted to Session

**Type:** Discovery

## Context

Applies when implementing or extending the `chat` command, which hands off to
`claude --resume <id>` interactively rather than calling `agentService.start` or
`agentService.resume`.

## What is true

`chat` does not go through the normal agent pipeline. Instead:

1. `agentService.chat()` sets `session.model` and `session.effort` directly on the
   in-memory session object.
2. `agentDomain.chat(session)` picks up those values via `buildChatArgs`.
3. The values are **persisted** to the session file as a side-effect — consistent with
   how `resume` behaves.

This means `--model` and `--effort` flags on `chat` affect both the current interactive
session and the stored session record.

## Do

- Expect model and effort to be saved to disk after a `chat` invocation with those flags.
- Set model/effort on the session object inside `agentService.chat()` — that is the
  canonical place for the chat flow.

## Don't

- Don't assume `chat` is stateless — it mutates and persists the session like other
  agent commands.
- Don't pass model/effort directly to `agentDomain.chat()` — set them on the session
  object in the service layer first.

---

**Keywords:** chat command, model, effort, session persistence, agentService, agentDomain, buildChatArgs, interactive, resume, flags
