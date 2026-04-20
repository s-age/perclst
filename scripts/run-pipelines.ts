#!/usr/bin/env tsx
// Runs all pipelines/*.json sequentially via `perclst run --yes`.
// Stops on first failure. Use --continue to proceed past failures.

import { readdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'
import { stdout } from '../src/utils/output.js'

const CONTINUE_ON_FAIL = process.argv.includes('--continue')

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pipelinesDir = join(repoDir, 'pipelines')

const files = readdirSync(pipelinesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => join(pipelinesDir, f))

if (files.length === 0) {
  stdout.print('No pipeline files found in pipelines/')
  process.exit(0)
}

stdout.print(`Found ${files.length} pipeline(s)\n`)

let failed = 0

for (const file of files) {
  stdout.print(`\n▶ ${file}`)
  const result = spawnSync('perclst', ['run', '--yes', file], { stdio: 'inherit' })

  if (result.status !== 0) {
    stdout.print(`✗ Failed: ${file}`)
    failed++
    if (!CONTINUE_ON_FAIL) {
      stdout.print('\nAborted. Use --continue to proceed past failures.')
      process.exit(1)
    }
  } else {
    stdout.print(`✓ Done: ${file}`)
  }
}

if (failed > 0) {
  stdout.print(`\n${failed} pipeline(s) failed.`)
  process.exit(1)
}

stdout.print('\nAll pipelines completed successfully.')
