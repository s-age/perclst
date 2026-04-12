---
name: typescript-quality
description: Use this skill when editing or creating .ts or .mjs files. Ensures lint and formatting are applied before finishing.
paths:
  - "**/*.ts"
  - "**/*.mjs"
---

# TypeScript Quality

After editing or creating `.ts` or `.mjs` files, always run the following before finishing:

```bash
npm run lint:fix
```

This runs both Prettier formatting and ESLint fixes in one pass.

If errors remain after `lint:fix` (i.e., issues that cannot be auto-fixed), resolve them manually before completing the task.

Warnings (e.g., function length) do not block completion but should be noted.
