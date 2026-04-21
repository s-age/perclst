# Port Transport Leakage

**Type:** Problem

## Context

When extracting infrastructure logic (e.g. permission prompts) from a monolithic handler into a
layered architecture, it is tempting to expose transport variants directly in the repository port.
This applies whenever a single logical operation can be performed over multiple transports (IPC,
TTY, HTTP, etc.).

## What happened / What is true

A refactor of `askPermission` exposed `askViaIPC` and `askViaTTY` as separate methods on
`IPermissionPipeRepository`. The domain then read `process.env.PERCLST_PERMISSION_PIPE` to decide
which to call. This created two simultaneous violations:

1. **Port leakage**: The port interface described *how* the operation is performed (IPC vs TTY),
   not *what* it does. Any caller had to know which transport applied — defeating the abstraction.
2. **Env var in domain**: The domain layer probed `process.env` to route between implementations.
   Domain code must be environment-agnostic; routing decisions belong in the repository layer.

**Fix**: Collapse to a single `askPermission(args)` on the port. The repository implementation
reads env vars and routes internally. The domain just calls `this.repo.askPermission(args)`.

## Do

- Name port methods after the *semantic operation* (`askPermission`), never the transport mechanism
- Keep env var reads and runtime routing inside the repository implementation
- Verify every method name in a port passes the test: "is this a domain-meaningful verb?"
  (`askViaIPC` fails; `askPermission` passes)

## Don't

- Expose transport variants (`askViaIPC`, `askViaTTY`) as separate methods on a port interface
- Read `process.env` from the domain layer to route between repository implementations
- Require callers of a port to know which backend or transport is in use

---

**Keywords:** port, DIP, repository, transport, leakage, env var, domain, IPC, TTY, abstraction, interface
