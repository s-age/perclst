---
name: split-component
description: Split a large CLI component into a parts/ subdirectory while keeping all existing import paths intact. Use when a component in src/cli/components/ grows too large or when asked to "split component".
paths:
  - 'src/cli/components/**'
disable-model-invocation: true
---

When splitting a component, follow these steps in order. Do not rename or update imports elsewhere — the re-export barrel keeps them stable.

1. **Confirm the target**: The component must be at `src/cli/components/<ComponentName>.tsx`. If it is not, stop and clarify before proceeding.

2. **Create the parts directory**: `src/cli/components/parts/<ComponentName>/`

3. **Move the implementation**: Place all component logic into `src/cli/components/parts/<ComponentName>/index.tsx`. If the component has natural sub-parts (e.g. a header, a row, a footer), split them into named sibling files within the same directory and re-export from `index.tsx`.

4. **Replace the original file**: Reduce `src/cli/components/<ComponentName>.tsx` to exactly one line:
   ```ts
   export { <ComponentName> } from './parts/<ComponentName>/index.js';
   ```

5. **Do not touch other import paths**: Every `import { <ComponentName> } from '...'` elsewhere in the codebase stays unchanged. The barrel file absorbs the move transparently.

6. **Verify**: Run `mcp__perclst__ts_checker` to confirm no broken imports or type errors before reporting done.

## Rules

- The original `ComponentName.tsx` must end up as a one-line re-export — nothing else in it
- The parts directory is the source of truth; never inline sub-parts back into the barrel
- Apply this pattern consistently across all CLI components — any existing `parts/` directories show the expected structure
- Only split when the component is genuinely large; don't apply pre-emptively to small files
