# Port Layer Is Deliberately Thick for LLM Readability

**Type:** Discovery

## Context

Applies when reviewing or modifying the port/interface layer in perclst (`domains/ports/`, `repositories/ports/`). The verbosity of this layer may look like over-engineering by typical software-quality heuristics, but it is an intentional design choice.

## What happened / What is true

- The port/interface layer is deliberately thick for a CLI of this size.
- It is designed to be LLM-friendly by eliminating conditional branching at read time.
- When an LLM reads the code, explicit port interfaces make all dependencies fully visible from the port definition alone — no need to trace through implementations or reason about duck typing.
- This makes changes safer and more predictable for an AI agent performing edits.
- Human code quality heuristics (e.g., "interface-per-class is overkill for small projects") do not apply here.

## Do

- Treat the verbosity of the port layer as a feature
- Add new port interfaces following the same explicit style when extending the system

## Don't

- Flag the port layer as over-engineered or suggest YAGNI pruning
- Collapse interfaces to reduce line count — the explicitness is the point
- Apply human-targeted code quality heuristics to this layer

---

**Keywords:** port, interface, LLM-friendly, design intent, domains/ports, repositories/ports, over-engineering, YAGNI
