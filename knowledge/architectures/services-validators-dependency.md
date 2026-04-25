# Services → Validators Is a Forbidden Dependency Direction

**Type:** Discovery

## Context

When `PipelineService` needed to parse child pipeline JSON files using Zod
(`parsePipeline`), it appeared that services might need to import from validators.
An architecture review (2026-04-25) confirmed this is forbidden and clarified the
correct approach.

## What is true

Dependency direction (upstream → downstream):

```
cli → validators → services → domains → repos → infrastructure
```

Services sit **below** validators in the dependency graph. A service importing
`parsePipeline` from validators inverts this direction and is not allowed.

**Correct solution:** Push the parse/load responsibility into the domain layer.

- `IPipelineLoaderDomain.load(path): Pipeline` — domain returns a typed object
- `PipelineLoaderDomain.load()` uses `repo.readRawJson(path) as Pipeline` (type cast, no Zod)
- Service calls `loaderDomain.load(absolutePath)` — no validator import needed

**Why type casting is acceptable for child pipelines:** Child pipelines are
developer-written config files checked into version control, not runtime user input.
Full Zod validation happens at the CLI boundary for the root pipeline only. Malformed
child pipelines surface as TypeScript errors at build time or as runtime errors when
the service processes invalid tasks.

## Do

- Confine Zod-based validation (`parsePipeline`) to the validators and CLI layers.
- Use `as Pipeline` casts in domains/repos for data whose shape is guaranteed by the
  CLI entry point.
- Push typed load/parse responsibility to `IPipelineLoaderDomain` when services need
  structured data.

## Don't

- Don't import from `validators/` inside `services/`.
- Don't add Zod validation inside domain or repo layers.
- Don't use callbacks on options objects (e.g. `PipelineRunOptions`) to work around
  the layer boundary — keep orchestration in service/domain.

---

**Keywords:** services, validators, dependency, layer-boundaries, child-pipeline, Zod, parsePipeline, architecture, domain
