#!/usr/bin/env tsx
// Installs perclst hooks into ~/.claude/settings.json
// Run once after `npm link`: npm run setup

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
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

// --- Load template ---
const template = JSON.parse(readFileSync(templatePath, 'utf-8'))

// --- Load existing ~/.claude/settings.json or start fresh ---
let dest: Record<string, unknown> = {}
const destExists = existsSync(destPath)
if (destExists) {
  dest = JSON.parse(readFileSync(destPath, 'utf-8'))
}

// --- Build merged result ---
const merged = JSON.parse(JSON.stringify(dest)) // deep clone
merged.hooks ??= {}

// Determine which hook event the template uses (PreToolUse or PostToolUse)
const hookEvent: string = template.hooks.PostToolUse ? 'PostToolUse' : 'PreToolUse'
merged.hooks[hookEvent] ??= []

// Remove any existing entry whose command references skill-inject.mjs
// (clean up both PreToolUse and PostToolUse in case of migration)
for (const event of ['PreToolUse', 'PostToolUse']) {
  if (!Array.isArray(merged.hooks[event])) continue
  merged.hooks[event] = merged.hooks[event].filter(
    (entry: Record<string, unknown>) =>
      !(entry.hooks as Array<Record<string, string>> | undefined)?.some((h) =>
        h.command?.includes('skill-inject.mjs')
      )
  )
  if (merged.hooks[event].length === 0) delete merged.hooks[event]
}

// Append entries from template
merged.hooks[hookEvent] ??= []
merged.hooks[hookEvent].push(...template.hooks[hookEvent])

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
stdout.print(`updated: ${destPath}`)
stdout.print('  hook -> $CLAUDE_PROJECT_DIR/hooks/skill-inject.mjs')
if (destExists) {
  stdout.print(`\nnote: original settings saved to ${backupPath}`)
  stdout.print('      you can restore it with:')
  stdout.print(`        cp ${backupPath} ${destPath}`)
}
