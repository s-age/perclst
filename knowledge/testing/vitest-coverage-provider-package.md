# Vitest Coverage Requires a Separate Provider Package

**Type:** External

## Context

When adding coverage reporting to a Vitest project, the `--coverage` flag alone is not enough. This applies any time a new project or CI pipeline is set up with Vitest and coverage is expected.

## What happened / What is true

- `vitest` does not bundle coverage support — it must be installed separately.
- Two provider options exist: `@vitest/coverage-v8` (V8 native) and `@vitest/coverage-istanbul`.
- Without the provider package installed, `--coverage` silently fails or throws an error.

Install:
```bash
npm install -D @vitest/coverage-v8
```

Configure in `vitest.config.ts`:
```ts
coverage: {
  provider: 'v8',
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts'],
}
```

## Do

- Add `@vitest/coverage-v8` (or `-istanbul`) as a `devDependency` before using `--coverage`.
- Specify `provider`, `include`, and `exclude` explicitly in `vitest.config.ts`.

## Don't

- Don't assume coverage works out of the box with a bare `vitest` install.
- Don't rely on silent failure messages to indicate a missing provider — always verify the package is present.

---

**Keywords:** vitest, coverage, v8, istanbul, @vitest/coverage-v8, devDependency, --coverage, vitest.config.ts
