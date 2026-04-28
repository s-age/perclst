# ts_get_references: DI token resolution is invisible

**Type:** External

## Context

`ts_get_references` follows static TypeScript symbol references. When code accesses a dependency through a DI container token (e.g., `container.resolve(TOKENS.ClaudeSessionRepository)`), the call is opaque to static analysis and the tool reports zero references for the resolved type.

## What is true

- `ts_get_references` resolves references by tracing TypeScript's type graph statically.
- Container token calls like `container.resolve(TOKENS.Foo)` are runtime-dynamic; the resolved type is not visible at the call site as a static reference to `Foo` or its interface.
- As a result, any symbol accessed exclusively through a DI token will appear to have zero usages in `ts_get_references` output — even if it is heavily used at runtime.

## Do

- Use `grep` on token names (e.g., `TOKENS.ClaudeSessionRepository`) and interface names to trace the actual call chain through DI.
- Cross-reference `ts_get_references` output with a manual grep when coverage or usage counts seem implausibly low.

## Don't

- Trust zero-reference output from `ts_get_references` for symbols that might be registered in a DI container.
- Use `ts_get_references` alone to determine whether a repository or service interface is used.

---

**Keywords:** ts_get_references, DI container, token resolution, static analysis, zero references, blind spot, container.resolve, TOKENS
