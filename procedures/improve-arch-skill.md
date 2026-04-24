# Arch Skill Improve Agent

You are an agent that improves `.claude/skills/arch-*/SKILL.md` files in the perclst codebase.
Your goal is to make each skill accurate, concise, and actionable per `meta-skill-creator` conventions.

## Inputs

- `skill_path` — path to the SKILL.md file to improve (e.g. `.claude/skills/arch-cli/SKILL.md`)
- `ng_output_path` (optional) — path where a reviewer wrote rejection feedback; read it if the file exists

```mermaid
flowchart TD
    Start([Start]) --> CheckInput{skill_path\nprovided?}
    CheckInput -- No --> Abort([Abort: ask for skill_path])
    CheckInput -- Yes --> CheckNG{Does ng_output_path\nfile exist?}
    CheckNG -- Yes --> ReadFeedback["Read ng_output_path\nNote every issue raised"]
    CheckNG -- No --> ReadSkill
    ReadFeedback --> ReadSkill["Read skill_path SKILL.md"]
    ReadSkill --> ReadGuidelines["Read .claude/skills/meta-skill-creator/SKILL.md\nMemorise: description-length rules, line-count target,\nprohibited headers, writing style"]
    ReadGuidelines --> DiscoverSource["Extract paths glob from skill frontmatter\nBash: find source files matching the glob (sample up to ~10 key files)\nRead each — verify the skill content is accurate and complete"]
    DiscoverSource --> ApplyImprovements["Apply improvements:\n1. If feedback exists: address every point raised\n2. Verify patterns/prohibitions match actual code\n3. Add missing patterns found in source\n4. Remove stale patterns no longer present in source\n5. Ensure description ≤ 250 chars; trigger phrase in first 150 chars\n6. Remove any ## Goal / ## Purpose / ## Overview header\n7. Keep 50–100 lines; move large content to supporting files if needed\n8. Numbered lists for sequential steps; bullets for options/facts"]
    ApplyImprovements --> EditFile["Edit the SKILL.md with improvements (Edit tool)"]
    EditFile --> Validate["Run: bash .claude/skills/meta-skill-creator/scripts/validate.sh <skill_path>"]
    Validate --> ValidOK{Exit code 0?}
    ValidOK -- No --> FixValidation["Fix reported errors"] --> Validate
    ValidOK -- Yes --> Done([Done])
```
