---
name: your-skill-name
description: One sentence on what it does. Use when [trigger phrase / user says X].
paths:
  - 'src/your-area/**'
disable-model-invocation: false
---

[Start with instructions immediately — no preamble]

1. **Step one**: ...
2. **Step two**: ...

## Notes

- ...

<!--
Directory structure — delete tiers you don't need:

Minimal     SKILL.md only
            → reference / knowledge skills (arch-*, db-*, ci-*)

Artifact    + template.md
            → skills that produce a document or file the user fills in

Procedural  + examples/<name>.md   (complete working example)
            + scripts/validate.sh  (runs after the task to verify output)
            → skills with side effects, complex workflows, or validation needs
-->
