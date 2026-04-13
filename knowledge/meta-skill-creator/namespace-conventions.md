# Skill Namespace Conventions for perclst

**Type:** Discovery

## Context

Applies when adding new skills to the perclst project. Consistent prefixes make
skills discoverable and communicate scope at a glance. These extend the base
conventions already defined in `meta-skill-creator`.

## What happened / What is true

Proposed namespace prefixes beyond the generic table in `meta-skill-creator`:

| Prefix | Candidate skills |
|:---|:---|
| `mcp-*` | MCP tool authoring, server registration patterns |
| `session-*` | Session file format, turn structure, manager API |
| `proc-*` | Procedure authoring (system prompt conventions) |
| `cli-*` | CLI command patterns, display layer, Commander.js wiring |

## Do

- Use `mcp-*` for any skill that teaches or automates MCP tool creation or server
  registration in perclst.
- Use `session-*` for skills dealing with `~/.perclst/sessions/` file format or
  the `SessionManager` API.
- Use `proc-*` for skills that help write or validate `procedures/*.md` files.
- Use `cli-*` for skills around Commander.js command structure or the display layer.

## Don't

- Don't invent a new prefix if an existing one fits — prefix sprawl defeats the
  point of namespacing.
- Don't use a generic prefix like `util-*` or `misc-*`; be specific.

---

**Keywords:** skill namespace, prefix convention, mcp, session, procedure, cli, perclst, skill naming
