# review Command Standard allowedTools

**Type:** Discovery

## Context

When configuring the `perclst review` command (which uses the `arch/review` procedure), the
`allowedTools` list must include tools that are not explicitly mentioned in the procedure file
itself. This applies every time the review command's tool allowlist is set or updated.

## What happened / What is true

Three tools were identified as necessary for effective reviews but are not spelled out in the
`arch/review` procedure description:

| Tool | Reason |
|---|---|
| `mcp__perclst__ask_permission` | Lets the agent ask the user before any destructive operation encountered during review |
| `mcp__perclst__knowledge_search` | Surfaces prior design decisions and gotchas to improve review accuracy |
| `mcp__perclst__ts_call_graph` | Allows the agent to trace call graphs for detecting responsibility violations and N+1 patterns |

## Do

- Always include the three tools above in the `allowedTools` for any review-type procedure,
  in addition to whatever tools the procedure file explicitly lists.

## Don't

- Don't rely solely on the procedure file to determine the complete `allowedTools` set —
  review procedures have implicit tool dependencies beyond what is written in the procedure.

---

**Keywords:** review, allowedTools, arch/review, mcp__perclst__ask_permission, knowledge_search, ts_call_graph, cli-commands, procedure configuration
