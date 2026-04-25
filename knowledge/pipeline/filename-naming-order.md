# Pipeline Filename Convention: namespace__operation__target

**Type:** Discovery

## Context

Applies when naming pipeline JSON files that have a namespace, an operation, and
an optional target segment. Correct segment order matters for alphabetical grouping
in directory listings.

## What happened / What is true

Correct order: `<namespace>__<operation>__<target>.json`  
Wrong order:   `<namespace>__<target>__<operation>.json`

The operation segment acts as a sub-namespace. Putting it before the target keeps
all related pipelines together alphabetically:

```
arch-react-hooks__refactor.json                    ← parent
arch-react-hooks__refactor__use-abort.json         ← child
arch-react-hooks__refactor__use-permission.json    ← child
arch-react-hooks__refactor__use-pipeline-run.json  ← child
```

If target comes before operation, files scatter and namespace grouping breaks:

```
arch-react-hooks__refactor.json
arch-react-hooks__use-abort__refactor.json
arch-react-hooks__use-permission__refactor.json
```

The general principle: **group by what varies least on the left, most on the
right**. An existing example — `review-feature-abort__core-di__review.json` —
follows this: the feature branch is the top-level namespace, the layer is the
sub-namespace, and the operation is last.

## Do

- Order segments as `namespace__operation__target` so related pipelines sort
  together.
- Apply the rule consistently: least-variable segment leftmost.

## Don't

- Don't put the target before the operation — it breaks alphabetical grouping.

---

**Keywords:** pipeline, filename, naming, convention, namespace, operation, target, alphabetical, sorting
