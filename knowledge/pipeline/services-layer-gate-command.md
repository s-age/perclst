# Services Layer Pipeline: Full Gate Command Required

**Type:** Discovery

## Context

When authoring unit-test pipelines that target `src/services/`, the quality-gate script
task requires a broader command than the one used for other layers (e.g. repositories).
Using only `npm run test:unit` is insufficient for services-layer pipelines.

## What happened / What is true

- The correct gate command for services-layer pipelines is:
  ```
  npm run format --fix && npm run lint:fix && npm run build && npm run test:unit
  ```
- The repositories layer uses only `npm run test:unit` as its gate command.
- Services layer code triggers lint, format, and build issues more frequently than
  repositories layer code, so catching all of them in one gate prevents partial failures
  from reaching a commit.
- This applies to pipeline files named `unit-test__services__*.json`.

## Do

- Use `npm run format --fix && npm run lint:fix && npm run build && npm run test:unit`
  as the script task command in `unit-test__services__*.json` pipeline files.
- Apply the same full gate whenever a pipeline covers code in `src/services/`.

## Don't

- Don't use only `npm run test:unit` as the gate for services-layer pipelines — it will
  let lint/format/build regressions pass through silently.
- Don't apply the repositories-layer gate (`npm run test:unit` alone) to services pipelines
  without verifying that the layer has no additional quality requirements.

---

**Keywords:** pipeline, quality gate, services layer, script task, lint, format, build, test:unit, unit-test pipeline
