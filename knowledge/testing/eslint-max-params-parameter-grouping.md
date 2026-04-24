# Eslint max-params: grouping parameters into objects

**Type:** Discovery

## Context

The eslint `local/max-params` rule (limit: 4 parameters) enforces a hard cap on function parameters. When refactoring functions to comply, the most maintainable approach is to group semantically related parameters into named object types rather than splitting the function.

## What is true

Eslint counts optional parameters toward the limit. A function with signature `(task, index, taskPath, options, rejected?)` has 5 parameters and violates the 4-parameter limit, even though `rejected` is optional.

Grouping parameters by semantic meaning reduces visual complexity and keeps related data together:
- Location info (`index`, `taskPath`) → `taskLocation: { index, taskPath }`
- Configuration (`execOpts`, `limits`) → `config: { execOpts, limits }`
- State management (`retryCount`, `pendingRejections`) → `state: { retryCount, pendingRejections }`

This is preferred over splitting the function when the function's responsibility is cohesive.

## Do

- Group parameters that are always used together or represent a single concept
- Use descriptive object property names that mirror the original parameter names
- Define grouped parameter types using `type` keyword (not `interface`)
- Update all call sites when changing function signatures

## Don't

- Split a cohesive function just to reduce parameters
- Create overly broad grouping objects that include unrelated data
- Use generic names like `opts` or `params` for grouped objects—prefer specific names

---

**Keywords:** eslint, max-params, parameter-grouping, refactoring, validation
