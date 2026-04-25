---
name: arch-react-hooks
description: React custom hook design. Use when writing, reviewing, or refactoring use* functions or components with non-trivial state/effect logic.
paths:
  - 'src/**/*.tsx'
  - 'src/**/*.ts'
user-invocable: false
---

When writing or reviewing a custom hook, answer these before touching code:

1. **Does this require React's lifecycle?** — If the logic runs without mount/update/unmount context, it is a plain function, not a hook.
2. **What is the React boundary?** — Identify exactly which part must live inside React (state sync, subscription, ref). Everything else moves out.
3. **Can the side effects be traced?** — If you cannot state when and how many times an effect runs, the design is wrong.

## Core principle

A hook is a **lifecycle adapter**, not a logic container. The name "hook" means attaching to React's render queue and state loop — it coexists with the calling component's mount/update/unmount timeline.

**Golden rule: maximize logic that can be written without knowing React.**

- Business logic → pure functions (no hooks, no React imports)
- Hooks → sync adapters that connect pure logic to React's lifecycle

## Patterns

**Good — pure logic extracted, hook is a thin adapter**

```ts
// Pure function: no React, fully testable in isolation
function computeDerivedValue(input: string): DerivedValue { ... }

// Hook: only the React-specific wiring
function useDerivedValue(input: string) {
  const [value, setValue] = useState(() => computeDerivedValue(input))
  useEffect(() => {
    setValue(computeDerivedValue(input))
  }, [input])
  return value
}
```

**Bad — pure computation wrapped in a hook for no reason**

```ts
// Nothing here requires React — wrapping it is noise and makes it untestable
function useComputeDerivedValue(input: string) {
  return useMemo(() => computeDerivedValue(input), [input])
}
```

**Good — side effects with a clear boundary**

```ts
function useSubscription<T>(subscribe: (cb: (v: T) => void) => () => void) {
  const [value, setValue] = useState<T | undefined>()
  useEffect(() => subscribe(setValue), [subscribe])
  return value
}
```

**Bad — side effects with scattered responsibility**

```ts
// Business logic, data fetching, and UI state mixed — impossible to trace when effects fire
function useUserDashboard(userId: string) {
  const [data, setData] = useState(null)
  useEffect(() => { fetch(...).then(setData) }, [userId])
  useEffect(() => { analytics.track(userId) }, [userId])
  const formatted = useMemo(() => format(data), [data])
  ...
}
```

## Dependency array diagnosis

`useEffect` / `useMemo` / `useCallback` dep warnings are **symptoms**, not the root problem. When deps are hard to maintain:

1. Ask whether the logic belongs in a pure function instead
2. Ask whether one effect is doing two unrelated things (split it)
3. Only then adjust the dep array

Do not silence lint warnings with `// eslint-disable` — fix the design.

## Prohibitions

- Never wrap a pure computation in `use*` just to "follow the pattern" — keep it a plain function
- Never mix data fetching, business logic, and UI state in one hook — each hook should have one job
- Never use a hook where a derived value (`const x = fn(y)`) would suffice
- Never treat the hook boundary as a catch-all for "things the component needs" — that is a component's job
