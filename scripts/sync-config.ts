#!/usr/bin/env tsx
// Syncs src/constants/config.ts from config.default.ts.
// - If config.ts does not exist: copies config.default.ts verbatim.
// - If config.ts exists: appends any exports present in config.default.ts but missing from config.ts.
// Run automatically via postinstall and prebuild.

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultPath = join(repoDir, 'src', 'constants', 'config.default.ts')
const configPath = join(repoDir, 'src', 'constants', 'config.ts')

if (!existsSync(configPath)) {
  copyFileSync(defaultPath, configPath)
  process.stdout.write(`[sync-config] created: ${configPath}\n`)
  process.exit(0)
}

const defaultContent = readFileSync(defaultPath, 'utf-8')
const configContent = readFileSync(configPath, 'utf-8')

function exportedNames(content: string): Set<string> {
  const names = new Set<string>()
  for (const m of content.matchAll(/^export (?:const|type|interface|function|class|enum) (\w+)/gm)) {
    names.add(m[1])
  }
  return names
}

// Extracts the full declaration block for a named export (handles multi-line).
// Ends just before the next top-level export/import line.
function extractBlock(content: string, name: string): string | null {
  const lines = content.split('\n')
  const start = lines.findIndex((l) =>
    new RegExp(`^export (?:const|type|interface|function|class|enum) ${name}\\b`).test(l)
  )
  if (start === -1) return null

  let end = lines.length - 1
  for (let i = start + 1; i < lines.length; i++) {
    if (/^(?:export|import) /.test(lines[i])) {
      end = i - 1
      break
    }
  }
  while (end > start && lines[end].trim() === '') end--
  return lines.slice(start, end + 1).join('\n')
}

const missing = [...exportedNames(defaultContent)].filter(
  (name) => !exportedNames(configContent).has(name)
)

if (missing.length === 0) process.exit(0)

const blocks = missing
  .map((name) => extractBlock(defaultContent, name))
  .filter((b): b is string => b !== null)

writeFileSync(configPath, configContent.trimEnd() + '\n\n// Synced from config.default.ts\n' + blocks.join('\n') + '\n')
process.stdout.write(`[sync-config] added ${missing.length} export(s) to config.ts: ${missing.join(', ')}\n`)
