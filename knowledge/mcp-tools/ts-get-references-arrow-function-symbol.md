# ts_get_references — Arrow Functions Have No Own AST Name

**Type:** Discovery

## Context

When `ts_get_references` resolves the enclosing function for a reference, it needs the symbol name
of the containing function. Arrow functions and function expressions have no name node of their own
in the TypeScript AST, requiring special handling.

## What happened / What is true

`findContainingSymbol` in `tsAstTraverser` walks up the AST from a reference node to find the
nearest enclosing function-like node, then resolves its name:

- **Named function declarations** (`function foo() {}`) carry their name directly on the node.
- **Arrow functions / function expressions** (`const foo = () => {}`) have no name; the name
  lives on the parent `VariableDeclaration`.
- The traverser walks up to the `VariableDeclaration` to extract the variable name.
- If the arrow function is **not** directly assigned to a variable (e.g. it's passed as an
  argument inline), no name is resolvable and `null` is returned. The reference is still emitted
  but without a `caller` field.

## Do

- When naming an arrow function for traceability, assign it to a named `const` at the statement
  level — this ensures `caller` is populated in recursive reference output
- Expect `caller` to be absent for arrow functions passed as inline arguments

## Don't

- Don't assume every reference will have a `caller` — guard against `undefined`/`null` in
  consumers of `RecursiveReferenceInfo`

---

**Keywords:** ts_get_references, arrow function, AST, VariableDeclaration, findContainingSymbol, caller field, ts-morph, function expression
