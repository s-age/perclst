# Vitest Constructor Mocks: `this: any` Annotation and Class Form Alternative

**Type:** Problem

## Context

Supplement to `vitest-class-constructor-mocking.md`. When a constructor mock uses a
regular function that assigns to `this`, TypeScript may infer `this` as `any` and trigger
the `local/no-any` rule. A class expression is a cleaner alternative.

## What happened / What is true

The regular-function form assigns to `this` so vitest can bind the new instance:

```ts
vi.mock('cli-table3', () => ({
  // eslint-disable-next-line local/no-any
  default: vi.fn(function (this: any) {
    this.push = mockTableInstance.push
    this.toString = mockTableInstance.toString
    return this
  })
}))
```

`this: any` is required because TypeScript cannot infer the constructor's `this` type inside
`vi.fn(...)`. The `local/no-any` ESLint rule fires, so the disable comment is needed.

**Class form avoids `this: any` entirely:**

```ts
vi.mock('some-module', () => ({
  default: vi.fn().mockImplementation(class {
    push = mockTableInstance.push
    toString = mockTableInstance.toString
  })
}))
```

A class expression is constructible, satisfies vitest's constructor-mock requirements, and
avoids both the `this: any` annotation and the eslint disable comment.

## Do

- Prefer the class expression form to avoid `this: any` and the ESLint disable comment
- When using the regular-function form, annotate `this: any` and add
  `// eslint-disable-next-line local/no-any` on the line above

## Don't

- Use an arrow function as the mock implementation for constructors — `TypeError: X is not a constructor`
- Omit `this: any` in the regular-function form when the rule is active — the lint error will surface

---

**Keywords:** vitest, constructor mock, this: any, class expression, vi.fn, local/no-any, eslint-disable, new keyword, mockImplementation
