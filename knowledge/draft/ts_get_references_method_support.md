# ts_get_references Now Supports Class Methods

## What Changed
Enhanced `ts_get_references` MCP tool to find references to class methods, not just top-level symbols.

## How to Use
- **Old**: `ts_get_references` only worked for top-level symbols: classes, functions, variables, interfaces, type aliases
- **New**: Use `"ClassName.methodName"` format to find references to methods

Example:
```
# Find references to AnalyzeDomain.analyze method
ts_get_references(file_path="src/domains/analyze.ts", symbol_name="AnalyzeDomain.analyze")
```

## Implementation Details

**File modified**: `src/infrastructures/tsAnalyzer.ts` - `getReferences()` method

The implementation:
1. Detects if `symbol_name` contains a "." character
2. If yes: splits into `className` and `methodName`, looks up the class, then finds the method on that class
3. If no: uses existing logic to find top-level symbols
4. Calls `findReferences()` on the found symbol (whether class method or top-level)

**Key code pattern**:
```typescript
if (symbolName.includes('.')) {
  const [className, methodName] = symbolName.split('.', 2)
  const classDecl = sourceFile.getClass(className)
  if (classDecl) {
    symbol = classDecl.getMethod(methodName)
  }
}
```

## Design Choices

- **Why "." separator**: Follows common naming convention (e.g., Java style `Class.method`), explicit and unambiguous
- **Why not "ClassName#methodName"**: "." is simpler and more discoverable in most contexts
- **Backward compatible**: Existing top-level symbol searches (just "ClassName" or "functionName") still work unchanged
- **Type pattern reused from existing code**: Uses `class_name` convention already documented in `knowledge/mcp-tools/ts-test-strategist-class-name-field.md`

## Limitations

- Only works for methods that exist in the source file (can't search cross-file yet)
- Private and protected methods are included (ts-morph's `findReferences()` finds them)
- Static methods work fine

## Testing

Added comprehensive tests in `src/infrastructures/__tests__/tsAnalyzer.test.ts`:
- Class method references found correctly
- Async method references work
- Non-existent methods return empty array gracefully
- Non-existent classes return empty array gracefully
- Backward compatibility maintained for top-level searches
