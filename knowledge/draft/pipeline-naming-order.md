# Pipeline filename order: namespace__operation__target

Correct order: `<namespace>__<operation>__<target>.json`
Wrong order:   `<namespace>__<target>__<operation>.json`

## Why

The operation segment acts as a sub-namespace. Putting it before the target
means all related pipelines group together alphabetically:

```
arch-react-hooks__refactor.json                    ← parent
arch-react-hooks__refactor__use-abort.json         ← child
arch-react-hooks__refactor__use-permission.json    ← child
arch-react-hooks__refactor__use-pipeline-run.json  ← child
arch-react-hooks__refactor__use-scroll-buffer.json ← child
```

If the target comes first, the files scatter and namespace grouping breaks:
```
arch-react-hooks__refactor.json
arch-react-hooks__use-abort__refactor.json
arch-react-hooks__use-permission__refactor.json
...
```

## Existing examples in the repo

`review-feature-abort__core-di__review.json` → `<feature>__<layer>__<operation>`

The operation (`review`) is last here because the feature branch is the
top-level namespace and the layer is the sub-namespace. The pattern holds:
group by what varies least on the left, most on the right.
