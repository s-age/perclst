# ESLint explicit-function-return-type Conflicts with arch-validators Zod Inference Rule

**Type:** Problem

## Context

Applies to `src/validators/rules/` whenever the global ESLint rule
`@typescript-eslint/explicit-function-return-type: error` is active. The
architecture rule for the validators layer forbids annotating validator
functions with `z.ZodType` return types — relying on Zod's type inference
instead. These two rules are directly incompatible.

## What happened / What is true

- Removing explicit Zod return type annotations (as arch-validators requires)
  triggers lint errors from `explicit-function-return-type`.
- The conflict produces 7 lint errors in `src/validators/rules/` when Zod
  return types are removed to comply with the architecture rule.
- The fix is a **directory-scoped ESLint override** in `eslint.config.js` that
  disables `explicit-function-return-type` for `src/validators/rules/**/*.ts`.
- This override was added in commit `bd8c3b4`.

## Do

- Add an ESLint override in `eslint.config.js` scoped to
  `src/validators/rules/**/*.ts` that disables `explicit-function-return-type`.
- Follow the architecture rule: let Zod infer return types; do not annotate
  validator functions with `z.ZodType`.

## Don't

- Don't add `z.ZodType` return-type annotations to satisfy ESLint — this
  violates the arch-validators rule and breaks Zod inference.
- Don't disable `explicit-function-return-type` globally just to fix validators.

---

**Keywords:** eslint, explicit-function-return-type, zod, arch-validators, validators, return type, lint, override, eslint.config.js
