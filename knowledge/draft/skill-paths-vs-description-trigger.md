# Gotcha: `paths:` frontmatter makes "Load before..." in description redundant

When a skill has `paths: src/foo/**/*.ts`, Claude auto-loads it whenever a file matching that
pattern is involved — covering creating, editing, reviewing, and investigating. Adding a phrase
like "Load before creating, editing, reviewing, or investigating files in this layer." to the
description duplicates this behavior and wastes the first-150-char trigger budget.

The description's job for `paths`-scoped skills is to help Claude recognize the context
*before* a specific file is opened (e.g., "let's add a new error class" → arch-errors).
Use keywords specific to the layer's purpose, not generic action verbs.

**Found while**: auditing arch-* skills — the phrase was intentionally added as a trigger
but turned out to be covered by `paths:` already, and caused validate.sh description-length
warnings (4 skills exceeded 150 chars solely because of this phrase).
