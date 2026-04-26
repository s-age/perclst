#!/usr/bin/env tsx
// Installs perclst hooks into ~/.claude/settings.json
// Run once after `npm link`: npm run setup

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, symlinkSync, unlinkSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'
import { stdout } from '../src/utils/output.js'

const YES = process.argv.includes('--yes') || process.argv.includes('-y')

stdout.print('Note: By default, perclst stores session data and logs under ~/.perclst/')
stdout.print('      You can override this in .perclst/config.json or ~/.perclst/config.json')
stdout.print('      e.g. { "sessions_dir": "./sessions", "logs_dir": "./logs" }')
stdout.print('')

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = join(repoDir, '.claude', 'settings.json')
const destPath = join(homedir(), '.claude', 'settings.json')
const backupPath = destPath + '.bak'

// --- Copy config.default.ts -> config.ts (if missing) ---
const configDefaultSrc = join(repoDir, 'src', 'constants', 'config.default.ts')
const configDest = join(repoDir, 'src', 'constants', 'config.ts')
if (!existsSync(configDest)) {
  copyFileSync(configDefaultSrc, configDest)
  stdout.print(`created: ${configDest}`)
} else {
  stdout.print(`exists:  ${configDest} (skipped)`)
}
stdout.print('')

// --- Copy skill-inject.mjs to ~/.perclst/ ---
const hookSrc = join(repoDir, 'hooks', 'skill-inject.mjs')
const hookDest = join(homedir(), '.perclst', 'skill-inject.mjs')
if (!existsSync(hookSrc)) throw new Error(`hook source not found: ${hookSrc}`)
mkdirSync(dirname(hookDest), { recursive: true })
if (existsSync(hookDest)) unlinkSync(hookDest)
symlinkSync(hookSrc, hookDest)

// --- Load template, replacing $CLAUDE_PROJECT_DIR ref with absolute hook path ---
const templateRaw = readFileSync(templatePath, 'utf-8').replaceAll(
  '\\"$CLAUDE_PROJECT_DIR\\"/hooks/skill-inject.mjs',
  hookDest
)
const template = JSON.parse(templateRaw)

// --- Load existing ~/.claude/settings.json or start fresh ---
let dest: Record<string, unknown> = {}
const destExists = existsSync(destPath)
if (destExists) {
  dest = JSON.parse(readFileSync(destPath, 'utf-8'))
}

// --- Build merged result ---
const merged = JSON.parse(JSON.stringify(dest)) // deep clone
merged.hooks ??= {}

// Collect all commands from template entries (for dedup)
function entryCommands(entry: Record<string, unknown>): Set<string> {
  return new Set(
    (entry.hooks as Array<Record<string, string>> | undefined)
      ?.map((h) => h.command)
      .filter(Boolean) ?? []
  )
}

// For each event in the template: remove existing entries whose commands overlap,
// then append the template entries.
for (const event of Object.keys(template.hooks) as string[]) {
  const templateEntries: Array<Record<string, unknown>> = template.hooks[event]
  if (!Array.isArray(templateEntries)) continue

  // Build set of all commands that the template will provide
  const templateCommands = new Set(
    templateEntries.flatMap((e) => [...entryCommands(e)])
  )

  merged.hooks[event] ??= []
  // Remove existing entries that would duplicate any template command,
  // or that reference skill-inject.mjs (covers old $CLAUDE_PROJECT_DIR path)
  merged.hooks[event] = (merged.hooks[event] as Array<Record<string, unknown>>).filter(
    (entry) =>
      ![...entryCommands(entry)].some(
        (cmd) => templateCommands.has(cmd) || cmd.includes('skill-inject.mjs')
      )
  )
  merged.hooks[event].push(...templateEntries)
}

// --- Show diff summary ---
const before = JSON.stringify(dest, null, 2)
const after = JSON.stringify(merged, null, 2)

stdout.print(`destination: ${destPath}`)
if (!destExists) {
  stdout.print('  (file does not exist — will be created)')
} else if (before === after) {
  stdout.print('  no changes needed')
  process.exit(0)
} else {
  stdout.print('\nbefore:')
  stdout.print(before)
  stdout.print('\nafter:')
  stdout.print(after)
}

// --- Confirm ---
if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await new Promise<void>((resolve, reject) => {
    rl.question('\nApply changes? [y/N] ', (answer) => {
      rl.close()
      if (answer.trim().toLowerCase() !== 'y') {
        stdout.print('aborted')
        reject(new Error('aborted'))
      } else {
        resolve()
      }
    })
  }).catch(() => process.exit(1))
}

// --- Backup existing file ---
if (destExists) {
  copyFileSync(destPath, backupPath)
  stdout.print(`backup:  ${backupPath}`)
}

// --- Write ---
mkdirSync(dirname(destPath), { recursive: true })
writeFileSync(destPath, after + '\n')
stdout.print(`linked:  ${hookDest} -> ${hookSrc}`)
stdout.print(`updated: ${destPath}`)
stdout.print(`  hook -> ${hookDest}`)
if (destExists) {
  stdout.print(`\nnote: original settings saved to ${backupPath}`)
  stdout.print('      you can restore it with:')
  stdout.print(`        cp ${backupPath} ${destPath}`)
}
