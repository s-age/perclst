# Use it.each for Structurally Identical Tests

**Type:** Discovery

## Context

When multiple test cases have identical structure but different inputs and expected outputs (e.g., testing error messages for different invalid options), writing separate `it()` blocks for each case creates redundancy and makes the test suite harder to maintain.

## What happened / What is true

Vitest's `it.each()` allows parameterized tests where the same test logic runs with different data:

```typescript
// ❌ BAD: 4 identical test blocks, only inputs differ
it('should error on -ab', () => { expect(() => fn(['-ab'])).toThrow() })
it('should error on -name', () => { expect(() => fn(['-name'])).toThrow() })
it('should error on -NAME', () => { expect(() => fn(['-NAME'])).toThrow() })
it('should error on -Model', () => { expect(() => fn(['-Model'])).toThrow() })

// ✅ GOOD: Single it.each block with parameterized inputs
it.each([
  ['-ab', "error: invalid option '-ab'"],
  ['-name', "error: invalid option '-name'"],
  ['-NAME', "error: invalid option '-NAME'"],
  ['-Model', "error: invalid option '-Model'"],
])('should error on %s', (input, expectedMsg) => {
  expect(() => fn([input])).toThrow()
  expect(spy).toHaveBeenCalledWith(expectedMsg)
})
```

The test name is dynamically generated with parameter placeholders (`%s` for strings, `%i` for numbers).

## Do

- Use `it.each()` when 3+ test cases share identical structure
- Place test data in an array: `[[input1, expected1], [input2, expected2]]`
- Use parameter placeholders in the test name: `%s`, `%i`, `%o` for display
- Extract parameters in the test callback: `(input, expectedMsg) =>`

## Don't

- Overuse `it.each()` for just 1–2 cases (use regular `it()`)
- Put logic inside the it.each array (keep data only)
- Make the test data array so large it becomes hard to read (split into multiple it.each blocks)

---

**Keywords:** vitest, it.each, parameterized tests, DRY, test data, test naming
