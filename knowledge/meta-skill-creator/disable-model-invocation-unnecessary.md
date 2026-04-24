# `disable-model-invocation` Is Redundant When Using `paths`

**Type:** Discovery

## Context

Applies when authoring skill frontmatter that scopes a skill with `paths`. The
`disable-model-invocation` field is often added out of habit to suppress
unwanted automatic activation, but it is superfluous in every common case.

## What happened / What is true

- `disable-model-invocation: false` is the default value — writing it adds
  noise without changing behavior.
- `disable-model-invocation: true` suppresses automatic model invocation, but
  when `paths` is already set, the paths glob controls which files trigger the
  skill. The field adds no further restriction and is therefore also redundant.
- The only case where `disable-model-invocation: true` is meaningful is when
  you explicitly want a skill that is **never** auto-triggered — e.g. a
  side-effecting skill (deploy, commit) that users should invoke manually via
  `/skill-name`. Even then, `paths` would not be set on such skills.

## Do

- Omit `disable-model-invocation` entirely from the frontmatter in most skills.
- Use `disable-model-invocation: true` only for explicitly user-invoked,
  side-effecting skills where automatic triggering would be dangerous.
- Let `paths` handle trigger scoping for all file-contextual skills.

## Don't

- Don't write `disable-model-invocation: false` — it is the default and
  contributes only noise.
- Don't add `disable-model-invocation: true` to a skill that already uses
  `paths` for scoping — `paths` already limits activation; the extra field is
  misleading.
- Don't confuse `disable-model-invocation` with `user-invocable: false`; the
  two fields control different aspects of skill visibility and triggering.

---

**Keywords:** disable-model-invocation, frontmatter, paths, skill activation, auto-trigger, skill authoring, redundant field
