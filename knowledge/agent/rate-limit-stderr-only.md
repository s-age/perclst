# Claude CLI Rate Limit Messages Are Stderr-Only

**Type:** External

## Context

Applies when streaming stdout from a `claude -p` child process line-by-line
(AsyncGenerator mode). Error detection — particularly rate limit errors — must
work without buffering stdout.

## What happened / What is true

The original `runClaude` implementation checked `stderr + stdout` (combined)
for rate limit messages. After switching to streaming mode, there is no clean
way to buffer stdout for error checking while also yielding it line-by-line.

In practice, the Claude CLI sends rate limit messages exclusively to **stderr**.
Checking stderr alone is sufficient for rate limit detection; stdout carries
only the assistant's response content.

## Do

- Check `stderr` alone for rate limit and other CLI error messages
- Buffer `stderr` fully (it is small) while streaming `stdout` line-by-line

## Don't

- Don't combine `stderr + stdout` for error matching in streaming mode
- Don't attempt to buffer stdout for error checking when it is being yielded
  incrementally — this defeats the purpose of streaming

---

**Keywords:** rate limit, stderr, stdout, streaming, claude CLI, error detection, AsyncGenerator, runClaude
