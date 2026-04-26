# ESLint max-lines-per-function Hits Setup/Registration Functions

**Type:** Problem

## Context

ESLint enforces a 50-line limit per function (`max-lines-per-function` rule). Setup functions that register many DI bindings — such as `setupServices` — grow past this limit as the service count increases.

## What happened

`setupServices` (and similar service-registration functions) exceeded 50 lines as new `container.register()` calls were added during a DI refactor. ESLint reported a violation at build time via `ts_checker`.

## Fix

Extract all `container.register()` calls into a dedicated helper:

```typescript
function registerAll(s: Services): void {
  s.container.register(TOKEN_A, { useClass: ServiceA });
  s.container.register(TOKEN_B, { useClass: ServiceB });
  // ...
}

export function setupServices(config: Config): Services {
  const s = buildServices(config);
  registerAll(s);
  return s;
}
```

The public `setupServices` function stays under 50 lines; `registerAll` absorbs future growth.

## Do

- Extract a `registerAll(s: Services): void` helper when `setupServices` approaches 50 lines
- Keep the public setup function as a thin wrapper

## Don't

- Add an ESLint disable comment to bypass the rule
- Mix `container.register()` calls with other logic to try to stay under the limit

---

**Keywords:** ESLint, max-lines-per-function, setupServices, DI registration, 50-line limit, extract helper
