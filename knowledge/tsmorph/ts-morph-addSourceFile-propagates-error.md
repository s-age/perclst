# ts-morph addSourceFileAtPath Throws Synchronously on Missing File

**Type:** External

## Context

MCP tools that call `project.addSourceFileAtPath(filePath)` via ts-morph do not catch file-not-found
errors. The error propagates to the caller. This matters for integration tests that assert error
behavior for nonexistent paths.

## What is true

`project.addSourceFileAtPath(filePath)` throws a synchronous error if the file does not exist on
disk at call time. The error is not caught by the MCP tool — it propagates out to the caller.

In integration tests this manifests as:

```ts
await expect(executeTool({ file: '/nonexistent.ts' })).rejects.toThrow()
```

The MCP SDK expects tool implementations to be correct; infrastructure-level errors are exceptional
and are not caught at the tool layer.

## Do

- Assert `rejects.toThrow()` in integration tests for missing-file scenarios
- Let the error propagate — no try/catch is needed in MCP tool code for this case

## Don't

- Don't expect a structured `content[]` error response when the file is missing
- Don't add try/catch in MCP tools to swallow `addSourceFileAtPath` errors

---

**Keywords:** ts-morph, addSourceFileAtPath, missing file, synchronous throw, MCP tool, error propagation, integration test
