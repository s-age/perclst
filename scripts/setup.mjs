#!/usr/bin/env node
// Installs perclst hooks into ~/.claude/settings.json
// Run once after `npm link`: npm run setup

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const templatePath = join(repoDir, '.claude', 'settings.json')
const destPath = join(homedir(), '.claude', 'settings.json')

// --- Load template and substitute __REPO_DIR__ ---
const template = JSON.parse(
  readFileSync(templatePath, 'utf-8').replace(/__REPO_DIR__/g, repoDir)
)

// --- Load existing ~/.claude/settings.json or start fresh ---
let dest = {}
if (existsSync(destPath)) {
  dest = JSON.parse(readFileSync(destPath, 'utf-8'))
}

// --- Merge hooks: remove stale perclst entries, add new one ---
dest.hooks ??= {}
dest.hooks.PreToolUse ??= []

// Remove any existing entry whose command references skill-inject.mjs
dest.hooks.PreToolUse = dest.hooks.PreToolUse.filter(entry =>
  !entry.hooks?.some(h => h.command?.includes('skill-inject.mjs'))
)

// Append entries from template
dest.hooks.PreToolUse.push(...template.hooks.PreToolUse)

// --- Write ---
mkdirSync(dirname(destPath), { recursive: true })
writeFileSync(destPath, JSON.stringify(dest, null, 2) + '\n')
console.log(`updated: ${destPath}`)
console.log(`  hook -> ${repoDir}/hooks/skill-inject.mjs`)
