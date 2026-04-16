# ts_test_strategist: class_name Is a Separate Field, Not Encoded in function_name

**Type:** Discovery

## Context

When `ts_test_strategist` emits analysis for a class method, it needs to convey both the
class name and the method name. A design decision was made about how to represent this in
the output schema.

## What happened / What is true

Class methods carry a dedicated `class_name?: string` field rather than encoding the class
as `ClassName#methodName` inside `function_name`.

The reason: `isCustomHook` and `isComponent` checks operate on `function_name` directly.
Encoding the class name into that string would require parsing it back out or adding
guards for the `#` character. A dedicated field keeps those checks clean and makes the
class/method relationship explicit in the structured output.

## Do

- Use `class_name?: string` as a separate field on the output object for class methods
- Keep `function_name` as the bare method name only
- Let consumers check `class_name` independently when they need the owning class

## Don't

- Don't encode class context into `function_name` (e.g. `MyService#doThing`)
- Don't parse `function_name` for a `#` separator to recover class context

---

**Keywords:** ts_test_strategist, class_name, function_name, class methods, schema design, isCustomHook, isComponent
