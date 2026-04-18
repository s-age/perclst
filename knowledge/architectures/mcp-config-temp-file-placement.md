# MCP Config Temp File Belongs in Infrastructure, Not Repository

**Type:** Discovery

## Context

`claude -p` requires an MCP config JSON file passed via `--mcp-config`. This
file is written just before the process is spawned and deleted in a `finally`
block. The question is which layer owns that write/delete.

## What happened / What is true

The `arch-repositories` rule prohibits raw Node.js `fs` calls inside
repository classes. More fundamentally, the temp file is an implementation
detail of *how the process is spawned* — the repository layer should never
know that the Claude CLI needs an MCP config file at all.

When `agentRepository.ts` called `writeFileSync`/`unlinkSync` directly it was
discovered during review: infrastructure internals had leaked upward into the
repository. The fix was to move temp-file setup and teardown into
`ClaudeCodeInfra.runClaude()`.

**Correct pattern:**

```ts
// Inside ClaudeCodeInfra.runClaude():
const mcpConfigPath = this.writeMcpConfig()   // private helper
try {
  yield* this.streamStdout(child.stdout)
} finally {
  child.kill()
  try { unlinkSync(mcpConfigPath) } catch { /* ignore */ }
}
```

## Do

- Own temp-file lifecycle (write + delete) inside the infrastructure class
  that spawns the process
- Keep `writeMcpConfig()` private to the infrastructure class

## Don't

- Don't write or delete temp files inside a repository class
- Don't let callers (repositories, use-cases) know about CLI-level
  implementation details such as MCP config files

---

**Keywords:** MCP config, temp file, infrastructure, repository, arch-repositories, ClaudeCodeInfra, runClaude, layering, fs, writeFileSync
