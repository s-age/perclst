# React Keys in Recursive flatMap Lose Uniqueness Across Siblings

**Type:** Problem

## Context

When rendering a tree of nodes using recursive `flatMap`, all nodes end up as flat
siblings in the same array. Keying on `depth` and local index (e.g., `"${depth}-${i}"`)
is not unique because two independent subtrees at the same depth produce identical keys.

## What happened / What is true

- `WorkflowPanel` used `key={\`${depth}-${i}\`}` for `TaskRow` elements returned from
  recursive `flatMap`
- All nodes share the same flat output array as siblings, so two parents can each produce
  a child at `depth=1, i=0` — both receive key `"1-0"`
- React warns about duplicate keys and may reuse the wrong element

## Do

- Pass a `parentKey` string through the recursion and build a dot-separated path:
  `"0"`, `"0.0"`, `"1.0"`, `"1.1.2"`, etc.
- Each node in the tree gets a globally unique key regardless of depth

```tsx
function renderTasks(tasks, depth, spinnerFrame, parentKey = '') {
  return tasks.flatMap((task, i) => {
    const key = parentKey ? `${parentKey}.${i}` : `${i}`
    return [
      <TaskRow key={key} ... />,
      ...renderTasks(task.children, depth + 1, spinnerFrame, key),
    ]
  })
}
```

## Don't

- Don't use `key={\`${depth}-${i}\`}` — depth + local index is not unique in a flattened array
- Don't rely on position alone when nodes from different subtrees share the same flat output

---

**Keywords:** react, key, flatMap, recursive, tree, unique, duplicate, reconciliation, siblings, depth
