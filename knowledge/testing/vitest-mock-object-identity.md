# Vitest: Mock Object Identity Assertions

**Type:** Problem

## Context

When writing unit tests with vitest mocks, comparing returned objects by accessing `mock.results[0].value` fails with Object.is equality errors. This gotcha appears when verifying that a service method correctly returns the mocked domain object.

## What happened / What is true

- `mock.results[0].value` returns a different object reference each time it's accessed
- `.toBe()` uses Object.is equality, which requires the exact same object reference
- Attempting `expect(result).toBe(domain.method.mock.results[0].value)` throws "Object.is equality" assertion error
- The issue does not occur when the mock is set up with a fixed return value via `mockResolvedValue()`

## Do

- Assert on object properties: `expect(result.id).toBe('expected-id')`
- Use `.toEqual()` to compare object shape: `expect(result).toEqual(expectedSession)`
- Verify the mock was called and trust the mocked return: `expect(domain.method).toHaveBeenCalledWith(...)`
- Set mocks with `.mockResolvedValue(fixedObject)` to ensure stable references

## Don't

- Compare returned objects to `mock.results[0].value` with `.toBe()`
- Access mock results multiple times expecting the same reference
- Try to verify object identity across mock result accesses

---

**Keywords:** vitest, mock, object identity, .toBe(), assertions, Object.is
