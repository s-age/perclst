#!/usr/bin/env node

import { Command } from 'commander'
import { assertNoSingleDashMultiCharOptions } from '@src/validators/cli/argFormat'
import { setupContainer } from '@src/core/di/setup'
import { registerAgentCommands } from './agentCommands'
import { registerSessionCommands } from './sessionCommands'

setupContainer()

const program = new Command()

program.name('perclst').description('CLI tool for managing Claude Code sub-agents').version('0.1.0')

registerAgentCommands(program)
registerSessionCommands(program)

assertNoSingleDashMultiCharOptions(process.argv.slice(2))

program.parse()
