# Ink: Braille Spinner Without External Package

**Type:** Discovery

## Context

A spinner is useful for indicating a running task in an Ink TUI. The common
approach is `ink-spinner`, but it adds a dependency and each row manages its own
interval. A lightweight alternative keeps all rows in sync and avoids the package.

## What happened / What is true

A braille spinner can be implemented with a single interval in the parent
component. The current frame index is passed as a prop to each task row, so all
rows display the same frame simultaneously — giving a cohesive animation.

```ts
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const [spinnerFrame, setSpinnerFrame] = useState(0)

useEffect(() => {
  const interval = setInterval(() => setSpinnerFrame((f) => f + 1), 80)
  return () => clearInterval(interval)
}, [])

// In each task row:
// SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length]
```

- One `setInterval` at 80 ms drives all rows — avoids timer drift between rows.
- `spinnerFrame` grows unboundedly; use `% length` at render time, not storage time.
- Clear the interval in the `useEffect` cleanup to prevent memory leaks.

## Do

- Manage the frame counter in the nearest common ancestor of all spinner consumers.
- Pass `spinnerFrame` as a plain number prop; let child components do the modulo.
- Return the `clearInterval` cleanup from `useEffect`.

## Don't

- Don't create one interval per task row — they will drift and look unpolished.
- Don't store the modulo result in state — it needlessly resets the effective frame sequence.
- Don't add `ink-spinner` as a dependency if a simple braille array satisfies the need.

---

**Keywords:** ink, spinner, animation, braille, useEffect, setInterval, interval, task row, no-dependency
