# ts-morph: Lazy Project Initialization

**Type:** External

## Context

`TsAnalyzer` wraps ts-morph's `Project` class to power the MCP TypeScript analysis tools. This applies whenever a class that owns a `Project` instance is constructed at module load time or command startup.

## What happened / What is true

- `new Project({ tsConfigFilePath })` scans the entire TypeScript project immediately on construction.
- When `TsAnalyzer` created the `Project` in its constructor, every CLI command (including ones unrelated to TypeScript analysis) paid the full scan cost at startup.
- Deferring construction to the first use eliminates the cost for all commands that never call the analyzer.

## Do

- Use a private lazy getter with a `_project: Project | null = null` backing field.
- Initialize inside `get project()` on the first call to `getSourceFile()` or similar.

```ts
private get project(): Project {
  if (!this._project) {
    if (this.options.skipAddingFilesFromTsConfig === true) {
      this._project = new Project({ skipAddingFilesFromTsConfig: true })
    } else {
      this._project = new Project({ tsConfigFilePath: this.options.tsConfigFilePath ?? 'tsconfig.json' })
    }
  }
  return this._project
}
```

## Don't

- Don't call `new Project(...)` in a constructor that runs at command startup.
- Don't assume `Project` construction is cheap — it always triggers a full tsconfig file scan.

---

**Keywords:** ts-morph, Project, lazy init, TsAnalyzer, startup cost, tsconfig scan, deferred initialization
