#!/usr/bin/env node
// Installs perclst hooks into ~/.claude/settings.json
// Run once after `npm link`: npm run setup

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const YES = process.argv.includes('--yes') || process.argv.includes('-y')

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = join(repoDir, '.claude', 'settings.json')
const destPath = join(homedir(), '.claude', 'settings.json')
const backupPath = destPath + '.bak'

// --- Load template and substitute __REPO_DIR__ ---
const template = JSON.parse(
  readFileSync(templatePath, 'utf-8').replace(/__REPO_DIR__/g, repoDir)
)

// --- Load existing ~/.claude/settings.json or start fresh ---
let dest = {}
const destExists = existsSync(destPath)
if (destExists) {
  dest = JSON.parse(readFileSync(destPath, 'utf-8'))
}

// --- Build merged result ---
const merged = JSON.parse(JSON.stringify(dest)) // deep clone
merged.hooks ??= {}
merged.hooks.PreToolUse ??= []

// Remove any existing entry whose command references skill-inject.mjs
merged.hooks.PreToolUse = merged.hooks.PreToolUse.filter(entry =>
  !entry.hooks?.some(h => h.command?.includes('skill-inject.mjs'))
)

// Append entries from template
merged.hooks.PreToolUse.push(...template.hooks.PreToolUse)

// --- Show diff summary ---
const before = JSON.stringify(dest, null, 2)
const after = JSON.stringify(merged, null, 2)

console.log(`destination: ${destPath}`)
if (!destExists) {
  console.log('  (file does not exist — will be created)')
} else if (before === after) {
  console.log('  no changes needed')
  process.exit(0)
} else {
  console.log('\nbefore:')
  console.log(before)
  console.log('\nafter:')
  console.log(after)
}

// --- Confirm ---
if (!YES) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  await new Promise((resolve, reject) => {
    rl.question('\nApply changes? [y/N] ', answer => {
      rl.close()
      if (answer.trim().toLowerCase() !== 'y') {
        console.log('aborted')
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
  console.log(`backup:  ${backupPath}`)
}

// --- Write ---
mkdirSync(dirname(destPath), { recursive: true })
writeFileSync(destPath, after + '\n')
console.log(`updated: ${destPath}`)
console.log(`  hook -> ${repoDir}/hooks/skill-inject.mjs`)
if (destExists) {
  console.log(`\nnote: original settings saved to ${backupPath}`)
  console.log('      you can restore it with:')
  console.log(`        cp ${backupPath} ${destPath}`)
}
