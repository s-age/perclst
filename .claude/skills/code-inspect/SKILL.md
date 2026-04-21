---
name: code-inspect
description: How to inspect a git diff before a push. Use when performing code inspection, reviewing changes for sensitive data, or producing a pre-push report.
disable-model-invocation: false
---

When inspecting a diff, work through these steps in order:

1. **Parse the diff structure** — identify each changed file, its added lines (`+`) and removed lines (`-`)

2. **Check for sensitive data** — scan every added line for:
   - API keys and tokens: patterns like `sk-`, `ghp_`, `AKIA`, `Bearer `, or long hex/base64 strings assigned to a variable
   - Credentials: passwords, secrets, or private keys in source code or config files
   - Personal information: email addresses, phone numbers, or real names outside of test fixtures

3. **Check for unintentional artifacts** — look for:
   - Debug statements left in (`console.log`, `debugger`, `print(`, `TODO: remove`)
   - Large blocks of commented-out code added in this diff
   - Temporary or generated files that should not be committed (`.env`, `*.log`, `dist/`, `node_modules/`)

4. **Classify each finding** using exactly one severity label:
   - `CRITICAL` — sensitive data leak; must block push
   - `WARNING` — likely unintentional (debug log, temp file, commented-out block)
   - `INFO` — minor issue worth noting but not blocking

5. **Write the report** in this format:

   ```
   ## Inspection Report

   ### Summary
   ✓ Clean  (or)  ✗ N issue(s) found

   ### Findings
   [SEVERITY] <file>:<line> — <short description>
   ...

   ### Verdict
   Push approved.  (or)  Push blocked — resolve CRITICAL issues before proceeding.
   ```

   Omit the Findings section if there are no issues.
