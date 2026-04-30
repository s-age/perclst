# ESLint 9 Flat Config: Deprecated context Methods Removed

**Type:** External

## Context

Writing or migrating custom ESLint rules to run under ESLint 9 flat config (`eslint.config.js`).

## What happened / What is true

ESLint 9 flat config refreshed the `RuleContext` API and removed the old method-based accessors:

| Old API (eslintrc) | New API (flat config) |
|---|---|
| `context.getFilename()` | `context.filename` |
| `context.getPhysicalFilename()` | `context.physicalFilename` |
| `context.getCwd()` | `context.cwd` |

Calling the old methods throws at rule-load time:

```
TypeError: Error while loading rule '...': context.getFilename is not a function
```

## Do

- Use the new property forms (`context.filename`, `context.physicalFilename`, `context.cwd`) in flat-config-only projects
- Use the null-coalescing fallback when a rule must support both config styles:
  ```js
  const filepath = context.filename ?? context.getFilename()
  ```

## Don't

- Don't call `context.getFilename()` in any rule targeting ESLint 9+ flat config — it does not exist
- Don't assume the old method names still work as aliases; they were fully removed

---

**Keywords:** ESLint 9, flat config, RuleContext, context.getFilename, context.filename, custom rule, migration
