---
name: config
description: Use this skill when working with configuration loading, config types, default values, or anything in src/lib/config/. Covers ConfigResolver priority chain and the Config/DisplayConfig interfaces.
paths:
  - src/lib/config/**
---

# Configuration

## Files
- `src/lib/config/resolver.ts` — `ConfigResolver`: static methods to load and resolve config
- `src/lib/config/types.ts` — `Config`, `DisplayConfig`, `DEFAULT_CONFIG`

## Load Priority

```
1. ./.perclst/config.json   (current working directory)
2. ~/.perclst/config.json   (home directory)
3. DEFAULT_CONFIG            (hardcoded defaults)
```

Loaded via object spread: `{ ...DEFAULT_CONFIG, ...globalConfig, ...localConfig }`

## Config Shape

```typescript
Config {
  sessions_dir?: string      // default: 'sessions'
  logs_dir?: string          // default: 'logs'
  model?: string             // default: 'claude-sonnet-4-6'
  max_tokens?: number        // default: 8000
  temperature?: number       // default: 0.7
  api_key_env?: string       // default: 'ANTHROPIC_API_KEY'
  display?: {
    header_color?: string    // default: '#D97757'
    no_color?: boolean       // default: false
  }
}
```

## Path Resolution (resolveSessionsDir / resolveLogsDir)
- Absolute path (`/...`) → used as-is
- Home-relative (`~/...`) → expanded with `homedir()`
- Relative → joined with `process.cwd()`

## Notes
- To change the default model, edit `DEFAULT_CONFIG.model` in `src/lib/config/types.ts`
- `NO_COLOR=1` env var disables color output regardless of config (honoring no-color.org)
