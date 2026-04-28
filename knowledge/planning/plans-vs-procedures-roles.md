# plans/ vs procedures/: Role Separation

**Type:** Discovery

## Context

When implementing a feature or test suite that involves both a plan document and a
procedure, it is important not to conflate the two. They serve different purposes and
should not duplicate each other.

## What is true

- **`plans/<slug>.md`** — Specifies *what* to implement or test. For integration tests:
  the list of commands, the test cases for each command, acceptance criteria.
  Acts as a specification that persists after the work is done.

- **`procedures/<name>/implement.md`** — Specifies *how* to do it. Contains the agent
  workflow, file conventions, DI patterns, and code structure rules.
  Applies to any future task of the same kind.

The plan document references the procedure in its header (e.g., a `perclst start`
invocation line), so an agent starting from the plan knows which procedure governs the
implementation details.

## Do

- Keep plan documents as specification artifacts — what to build, what to verify.
- Keep procedure documents as methodology artifacts — how to build it.
- Include the `perclst start ... --procedure <name>` command in the plan's header so
  agents pick up the right procedure automatically.

## Don't

- Duplicate methodology details (DI patterns, code conventions) inside a plan document.
- Put test-case specifications inside a procedure — procedures are reusable across plans.

---

**Keywords:** plans, procedures, role separation, specification, methodology, integration test planning
