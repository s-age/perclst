# Skill Scripts That Use require() Need .cjs Extension

**Type:** Problem

## Context

Applies to any skill that ships a Node.js helper script using CommonJS `require()` inside a project where `package.json` has `"type": "module"`. Running such a script with a `.js` extension fails at runtime.

## What happened / What is true

When `"type": "module"` is set, Node.js treats every `.js` file as an ES Module. Using `require()` in a `.js` script throws:

```
ReferenceError: require is not defined in ES module scope
```

The fix is to give the file a `.cjs` extension, which forces Node.js to treat it as CommonJS regardless of the package type.

```
.claude/skills/my-skill/scripts/
├── validate-schema.cjs   ← .cjs enforces CommonJS
└── validate-name.sh
```

Reference the script from `SKILL.md` using `${CLAUDE_SKILL_DIR}`, which expands to the skill's absolute directory at runtime — making the path independent of the working directory:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/validate-schema.cjs pipelines/<name>.yaml
bash ${CLAUDE_SKILL_DIR}/scripts/validate-name.sh pipelines/<name>.yaml
```

## Do

- Use `.cjs` for any skill script that uses `require()`
- Reference scripts via `${CLAUDE_SKILL_DIR}/scripts/<file>` in `SKILL.md`

## Don't

- Don't name CommonJS skill scripts `.js` in ESM projects
- Don't use relative paths to scripts in `SKILL.md` — they break when the working directory differs from the skill directory

---

**Keywords:** skill scripts, CommonJS, ESM, require, .cjs, type module, CLAUDE_SKILL_DIR, ReferenceError
