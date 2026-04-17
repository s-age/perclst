# Quality Gate Script Task: Use `npm run test:unit`, Not `npm run test`

**Type:** Problem

## Context

When authoring a pipeline `script` task that acts as a quality gate (e.g., running the test suite before promoting or deploying), the choice of npm script matters. Using the wrong script causes the gate to fail or behave unexpectedly.

## What happened / What is true

- `npm run test` is incorrect for pipeline quality gates in this project and will fail or produce unexpected results.
- `npm run test:unit` is the correct command for unit-test quality gates.
- This distinction is enforced in the `meta-pipeline-creator` skill's verification checklist.

## Do

- Use `npm run test:unit` in pipeline `script` tasks that gate on test results.
- Verify the exact npm script name exists in `package.json` before wiring it into a pipeline.

## Don't

- Don't use `npm run test` as a quality gate command — it is not the correct target in this codebase.
- Don't assume `npm run test` and `npm run test:unit` are interchangeable.

---

**Keywords:** pipeline, quality gate, script task, npm test, test:unit, npm run test
