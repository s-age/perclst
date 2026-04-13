# Skill Content Patterns — Shell Preprocessing, Supporting Files, and Arguments

**Type:** Discovery

## Context

Applies when authoring SKILL.md files. Covers three independent patterns that extend
what a skill can do: injecting live shell output before Claude sees the prompt,
organizing large reference material outside SKILL.md, and handling user-supplied
arguments.

## What happened / What is true

### Dynamic context injection (shell preprocessing)

Backtick syntax runs a shell command before Claude sees the skill content:

```
Pull request diff: !`gh pr diff`
Changed files: !`gh pr diff --name-only`
```

Multi-line variant:

    ```!
    node --version
    git status --short
    ```

This is **preprocessing**, not something Claude executes at runtime. Claude sees only
the rendered output. Can be disabled org-wide with `"disableSkillShellExecution": true`
in managed settings.

### Supporting files pattern

Large reference material should live outside SKILL.md:

```
my-skill/
├── SKILL.md          # ~50–100 lines; references the files below
├── reference.md      # detailed API / field docs
└── examples.md       # sample outputs or transcripts
```

Explicitly reference them so Claude knows to load on demand:

```markdown
For the complete field reference, see [reference.md](reference.md).
```

### `$ARGUMENTS` behavior

- If the `$ARGUMENTS` placeholder is absent from content, args are appended as
  `ARGUMENTS: <value>` at the end of the prompt.
- Positional access: `$ARGUMENTS[0]` / `$0`, `$ARGUMENTS[1]` / `$1`.
- Multi-word values require quoting: `/my-skill "hello world" second`.

## Do

- Use `!` backtick preprocessing to inject fresh shell state (git status, diff, env
  info) so Claude acts on current data, not stale context.
- Keep SKILL.md short; move lengthy docs into `reference.md` or `examples.md` and
  link explicitly.
- Include `$ARGUMENTS` in content when you want positional argument placement;
  omit it only if appending at the end is acceptable.

## Don't

- Don't treat shell preprocessing as something Claude can re-run — it fires once,
  before invocation.
- Don't write multi-hundred-line SKILL.md files; split into supporting files instead.

---

**Keywords:** shell preprocessing, backtick syntax, dynamic context, supporting files, $ARGUMENTS, positional arguments, SKILL.md structure, disableSkillShellExecution
