# JavaScript Array slice(-0) Behavior

**Type:** Discovery

## Context

When writing tests for array filtering or slicing operations, edge cases like `slice(-0)` can produce unexpected results. This applies to any code that dynamically constructs slice arguments, particularly when implementing filter functions with variadic boundaries.

## What happened / What is true

In JavaScript, `-0` is identical to `0` numerically. When used as a slice argument:

- `array.slice(-0)` is equivalent to `array.slice(0)` and returns the entire array from index 0 to the end
- `array.slice(0, 0)` returns an empty array (both start and end are 0)

Example:
```javascript
[1, 2, 3].slice(-0)  // → [1, 2, 3] (full array)
[1, 2, 3].slice(0, 0) // → [] (empty)
```

In `applyRowFilter` with `result.slice(-filter.tail)`, passing `tail: 0` returns the full array, not an empty one.

## Do

- Use explicit conditionals if 0 means "return nothing": `if (n === 0) return []` before calling slice
- Test boundary cases explicitly (0, 1, negative, exceeding length) when implementing slice-based filters
- Document the behavior in code comments if it's non-obvious

## Don't

- Assume `slice(-n)` with `n=0` returns an empty array
- Rely on mathematical symmetry between positive and negative slice indices without testing

---

**Keywords:** slice, negative-zero, JavaScript quirk, array filtering, edge case
