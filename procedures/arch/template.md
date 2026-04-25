# Architecture Review Report — Template

Use this format for all output from the `arch/review` procedure.

`<CHECK>` is one of: `FORBIDDEN_IMPORT` | `RESPONSIBILITY` | `DI_CONSISTENCY` | `PORT_PLACEMENT`

---

```
# Architecture Violation Report — <target_path>
Reviewed: <YYYY-MM-DD>

## Summary

✓ Architecture is clean  (or)  ✗ N violation(s) found

## Violations

### [<CHECK>] `<file_path>`:<line> — <short description>

**layer:** `<layer>`
**check:** <check>

<Full description of what rule is broken and why, with a code excerpt if it aids clarity.>

**Recommendation:** <Which layer/file the code belongs in and what to change.>

---

(repeat for each violation)

> **For the refactor agent:** Apply all code changes first. Run `ts_checker` once only after all edits are complete.
```

**Rules:**
- Summary MUST NOT include file count ("across N files") or a list of scanned files
- Omit the Violations section and the refactor-agent note when there are no violations
