# Port Interface Signature Drift Goes Undetected by TypeScript

**Type:** Problem

## Context

In TypeScript projects that use port interfaces (e.g., `IPipelineDomain`) to decouple layers,
refactoring a domain method's signature without updating the interface causes silent divergence.
TypeScript does not reliably surface this at the `implements` declaration site.

## What happened / What is true

- `IPipelineDomain` still declared old flat positional params after `PipelineDomain` was refactored
  to grouped-object params:

  ```ts
  // Interface (stale — flat positional)
  resolveRejection(pipeline, toName, taskIndex, currentCount, maxRetries, feedback): RejectionResult

  // Implementation (updated — grouped objects)
  resolveRejection(pipeline, target: { toName; feedback }, retryState: { taskIndex; currentCount; maxRetries }): RejectionResult
  ```

- TypeScript did **not** error at the `implements PipelineDomain` site; the mismatch was invisible
  there.
- Errors appeared later, in `pipelineService.ts`, when the service called the domain through the
  interface — with confusing messages about argument count or incompatible object types.
- `runWithLimit` was declared `public` in the interface but `private` in the implementation.
  Because the service never called it, the dead surface area went unnoticed until review.

## Do

- Update the port interface **in the same commit** as any domain method signature refactor.
- Only expose in the port interface the methods the service layer actually calls.
- After any signature change, run `ts_checker` (or `tsc --noEmit`) to catch call-site errors early.

## Don't

- Don't rely on the `implements` declaration to catch interface/implementation divergence —
  TypeScript's structural typing can mask mismatches there.
- Don't declare private domain helpers in the port interface; they add dead surface area and
  mislead future readers.

---

**Keywords:** port interface, TypeScript, implements, signature drift, IPipelineDomain, grouped-object params, flat positional, service layer, refactoring, structural typing
