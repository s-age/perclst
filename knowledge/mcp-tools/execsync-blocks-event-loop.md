# execSync Blocks the MCP Event Loop

**Type:** Problem

## Context

Applies whenever a Node.js MCP server tool needs to run a subprocess (lint, build, test,
etc.). MCP servers run on a single-threaded event loop; blocking calls prevent the server
from processing any other request until they return.

## What happened / What is true

`commandRunner.ts` originally used `execSync` to invoke lint and build commands. Inside an
MCP server this meant:

- The entire server was frozen for the duration of the subprocess.
- No other MCP tool call could be handled until the blocking call finished.
- Errors surfaced as uncaught exceptions rather than as rejected promises.

Switching to `exec` + `util.promisify` made the calls non-blocking. As a side-effect,
multiple commands (lint, build, test) could then be run in parallel with `Promise.all`,
cutting total wall-clock time.

## Do

- Use `util.promisify(exec)` (or `execa`, `spawn` with stream handling) for all
  subprocess calls inside MCP tool handlers.
- Run independent commands concurrently with `Promise.all`.
- Handle errors via `catch` on the returned promise.

## Don't

- Don't use `execSync`, `spawnSync`, or any other synchronous child-process API inside
  an MCP server handler.
- Don't assume that a blocking call is safe just because the tool "usually finishes fast."

---

**Keywords:** execSync, MCP server, event loop, blocking, Node.js, promisify, exec, async, parallel, subprocess
