#!/usr/bin/env node
// perclst skill auto-injection hook (PreToolUse)
// Reads skills from .claude/skills/*/SKILL.md (Claude Code native format)
// and injects matching skill content as additionalContext.

import {
  readFileSync,
  existsSync,
  writeFileSync,
  appendFileSync,
  renameSync,
  readdirSync,
  openSync,
  writeSync,
  closeSync
} from 'fs'
import { join, matchesGlob } from 'path'
import { homedir } from 'os'

// --- stdin ---
const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'))
const { tool_name, tool_input, cwd } = input

// Skip in interactive mode — skills are injected natively by Claude Code there.
// PERCLST_SESSION_FILE is only set when perclst spawns a sub-agent via claude -p.
if (!process.env.PERCLST_SESSION_FILE) process.exit(0)

// If a global ~/.perclst/skill-inject.mjs exists, only run from there to avoid duplicate injection.
const homePerclstScript = join(homedir(), '.perclst/skill-inject.mjs')
const scriptPath = new URL(import.meta.url).pathname
if (existsSync(homePerclstScript) && !scriptPath.startsWith(join(homedir(), '.perclst') + '/')) process.exit(0)

// Only handle file-path tools
const FILE_TOOLS = new Set(['Read', 'Edit', 'Write', 'Glob', 'Grep'])
if (!FILE_TOOLS.has(tool_name)) process.exit(0)

// Extract file path — key name differs by tool
const filePath = tool_input.file_path ?? tool_input.path ?? tool_input.pattern ?? ''
if (!filePath) process.exit(0)

// Normalize to absolute, then to CWD-relative for glob matching
const absPath = filePath.startsWith('/') ? filePath : join(cwd, filePath)
const relPath = absPath.startsWith(cwd + '/') ? absPath.slice(cwd.length + 1) : filePath

// --- Locate .claude/skills dirs: project-local takes priority over global ---
// Each dir is scanned for <skill-name>/SKILL.md
const skillsDirs = [join(cwd, '.claude/skills'), join(homedir(), '.claude/skills')].filter(
  existsSync
)

if (skillsDirs.length === 0) process.exit(0)

// --- Parse YAML frontmatter from a skill file ---
// Returns { name, paths, autoInject } or null if no valid frontmatter
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) return null

  const fm = match[1]

  // Extract name
  const nameMatch = fm.match(/^name:\s*(.+)$/m)
  const name = nameMatch?.[1].trim()
  if (!name) return null

  // Extract auto-inject (defaults to true)
  const autoInjectMatch = fm.match(/^auto-inject:\s*(.+)$/m)
  const autoInject = autoInjectMatch ? autoInjectMatch[1].trim() !== 'false' : true

  // Extract paths (YAML list)
  const pathsMatch = fm.match(/^paths:\n((?: {2}- .+\n?)*)/m)
  if (!pathsMatch) return { name, paths: [], autoInject }

  const paths = pathsMatch[1]
    .split('\n')
    .map((line) => {
      const val = line.match(/^\s+-\s+(.+)$/)?.[1]?.trim()
      if (!val) return undefined
      // Strip surrounding YAML quotes (' or ")
      if (
        (val.startsWith("'") && val.endsWith("'")) ||
        (val.startsWith('"') && val.endsWith('"'))
      ) {
        return val.slice(1, -1)
      }
      return val
    })
    .filter(Boolean)

  return { name, paths, autoInject }
}

// --- Collect all skills from dirs ---
function collectSkills(skillsDirs) {
  const skills = []
  for (const dir of skillsDirs) {
    for (const entry of readdirSync(dir)) {
      const skillFile = join(dir, entry, 'SKILL.md')
      if (!existsSync(skillFile)) continue
      try {
        const content = readFileSync(skillFile, 'utf-8')
        const fm = parseFrontmatter(content)
        if (!fm) continue
        // Body is everything after the closing ---
        const body = content.replace(/^---\n[\s\S]*?\n---\n/, '')
        skills.push({ name: fm.name, paths: fm.paths, autoInject: fm.autoInject, body })
      } catch {}
    }
  }
  return skills
}

// --- Load display config for color output ---
function loadDisplayConfig() {
  for (const cfgPath of [
    join(cwd, '.perclst/config.json'),
    join(homedir(), '.perclst/config.json')
  ]) {
    if (!existsSync(cfgPath)) continue
    try {
      const cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'))
      return cfg.display ?? {}
    } catch {}
  }
  return {}
}

// --- Injection state: /tmp/perclst-<ppid>.injected ---
const procState = `/tmp/perclst-${process.ppid}.injected`

// Seed from session JSON on first invocation (resume support)
if (!existsSync(procState)) {
  const sessionFile = process.env.PERCLST_SESSION_FILE
  let seed = ''
  if (sessionFile && existsSync(sessionFile)) {
    try {
      const session = JSON.parse(readFileSync(sessionFile, 'utf-8'))
      seed = (session.injected_skills ?? []).join('\n')
      if (seed) seed += '\n'
    } catch {}
  }
  writeFileSync(procState, seed)
}

const injectedSet = new Set(readFileSync(procState, 'utf-8').split('\n').filter(Boolean))

// --- Match skills against the target file ---
const skills = collectSkills(skillsDirs)

let context = ''
const newSkills = []

for (const { name, paths, autoInject, body } of skills) {
  if (injectedSet.has(name)) continue
  if (!autoInject) continue
  if (paths.length === 0) continue

  const matches = paths.some((pattern) => matchesGlob(relPath, pattern))
  if (!matches) continue

  context += `\n=== Skill: ${name} ===\n> HEADLESS MODE: The Skill tool is not available. Execute these instructions directly without invoking Skill().\n\n${body}`
  newSkills.push(name)
}

if (newSkills.length === 0) process.exit(0)

// --- Update process state ---
appendFileSync(procState, newSkills.join('\n') + '\n')

// --- Persist injected_skills to session JSON ---
const sessionFile = process.env.PERCLST_SESSION_FILE
if (sessionFile && existsSync(sessionFile)) {
  try {
    const allSkills = readFileSync(procState, 'utf-8').split('\n').filter(Boolean)
    const session = JSON.parse(readFileSync(sessionFile, 'utf-8'))
    session.injected_skills = allSkills
    const tmp = sessionFile + '.tmp'
    writeFileSync(tmp, JSON.stringify(session, null, 2))
    renameSync(tmp, sessionFile)
  } catch {}
}

// --- Styled stderr notification ---
function hexToRgb(hex) {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [217, 119, 87]
}

const displayConfig = loadDisplayConfig()
const noColor = displayConfig.no_color || !!process.env.NO_COLOR
const [r, g, b] = hexToRgb(displayConfig.header_color ?? '#D97757')

// Write directly to /dev/tty so the notification reaches the user's terminal
// even when Claude Code captures the hook's stderr internally.
try {
  const fd = openSync('/dev/tty', 'w')
  for (const name of newSkills) {
    const msg = noColor
      ? `[perclst] Skill injected: ${name}\n`
      : `\x1b[48;2;${r};${g};${b}m\x1b[97m [perclst] Skill injected: ${name} \x1b[0m\n`
    writeSync(fd, msg)
  }
  closeSync(fd)
} catch {
  // Fallback: no /dev/tty (non-interactive), silently skip
}

// --- JSON response to stdout ---
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      additionalContext: context
    }
  })
)
