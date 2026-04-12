#!/usr/bin/env tsx
// Installs perclst hooks into ~/.claude/settings.json
// Run once after `npm link`: npm run setup

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'
import { logger } from '../src/utils/logger.js'

const YES = process.argv.includes('--yes') || process.argv.includes('-y')

logger.print('Note: By default, perclst stores session data and logs under ~/.perclst/')
logger.print('      You can override this in .perclst/config.json or ~/.perclst/config.json')
logger.print('      e.g. { "sessions_dir": "./sessions", "logs_dir": "./logs" }')
logger.print('')

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
merged.hooks.PreToolUse ??= []

// Remove any existing entry whose command references skill-inject.mjs
merged.hooks.PreToolUse = merged.hooks.PreToolUse.filter(
  (entry: Record<string, unknown>) =>
    !(entry.hooks as Array<Record<string, string>> | undefined)?.some((h) =>
      h.command?.includes('skill-inject.mjs')
    )
)

// Append entries from template
merged.hooks.PreToolUse.push(...template.hooks.PreToolUse)

// --- Show diff summary ---
const before = JSON.stringify(dest, null, 2)
const after = JSON.stringify(merged, null, 2)

logger.print(`destination: ${destPath}`)
if (!destExists) {
  logger.print('  (file does not exist — will be created)')
} else if (before === after) {
  logger.print('  no changes needed')
  process.exit(0)
} else {
  logger.print('\nbefore:')
  logger.print(before)
  logger.print('\nafter:')
  logger.print(after)
}

// --- Confirm ---
if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await new Promise<void>((resolve, reject) => {
    rl.question('\nApply changes? [y/N] ', (answer) => {
      rl.close()
      if (answer.trim().toLowerCase() !== 'y') {
        logger.print('aborted')
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
  logger.print(`backup:  ${backupPath}`)
}

// --- Write ---
mkdirSync(dirname(destPath), { recursive: true })
writeFileSync(destPath, after + '\n')
logger.print(`updated: ${destPath}`)
logger.print('  hook -> $CLAUDE_PROJECT_DIR/hooks/skill-inject.mjs')
if (destExists) {
  logger.print(`\nnote: original settings saved to ${backupPath}`)
  logger.print('      you can restore it with:')
  logger.print(`        cp ${backupPath} ${destPath}`)
}
