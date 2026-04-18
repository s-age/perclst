# .mcp.json args Accept Relative Paths

**Type:** External

## Context

When registering an MCP server in `.mcp.json`, you must specify the path to the server entry point in the `args` array. The choice between absolute and relative paths affects portability across cloned environments.

## What happened / What is true

- Claude Code resolves paths in `.mcp.json` `args` relative to the directory that contains `.mcp.json` (i.e. the project root).
- A relative path such as `./dist/src/mcp/server.js` works correctly.
- An absolute path (e.g. `/Users/alice/project/dist/src/mcp/server.js`) breaks for any other developer who clones the repository.

## Do

- Use relative paths in `.mcp.json` `args`, e.g.:
  ```json
  { "args": ["./dist/src/mcp/server.js"] }
  ```
- Commit `.mcp.json` with relative paths so the configuration is portable.

## Don't

- Don't use absolute paths in `.mcp.json` `args`.
- Don't assume paths are resolved relative to the current working directory of the shell; they are relative to the `.mcp.json` file's location.

---

**Keywords:** .mcp.json, MCP, relative path, absolute path, args, Claude Code, portability, project root
