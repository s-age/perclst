import type { AgentResponse } from '../lib/agent/types.js'
import { ConfigResolver } from '../lib/config/resolver.js'

const RESET = '\x1b[0m'
const DIM = '\x1b[2m'

function hexToAnsi(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return ''
  const [, r, g, b] = m
  return `\x1b[38;2;${parseInt(r, 16)};${parseInt(g, 16)};${parseInt(b, 16)}m`
}

function resolveColor(): string {
  // NO_COLOR env var (https://no-color.org/)
  if (process.env.NO_COLOR !== undefined) return ''

  const config = ConfigResolver.load()
  if (config.display?.no_color) return ''

  const hex = config.display?.header_color ?? '#D97757'
  return hexToAnsi(hex)
}

function header(text: string): string {
  const color = resolveColor()
  return color
    ? `\n${color}--- ${text} ---${RESET}`
    : `\n--- ${text} ---`
}

function toolLabel(name: string): string {
  const color = resolveColor()
  return color ? `${color}[${name}]${RESET}` : `[${name}]`
}

export interface DisplayOptions {
  silentToolResponse?: boolean
  silentThoughts?: boolean
  silentUsage?: boolean
  outputOnly?: boolean
}

export function printResponse(response: AgentResponse, opts: DisplayOptions = {}) {
  const silentThoughts = opts.outputOnly || opts.silentThoughts
  const silentToolResponse = opts.outputOnly || opts.silentToolResponse
  const silentUsage = opts.outputOnly || opts.silentUsage

  if (!silentThoughts && response.thoughts && response.thoughts.length > 0) {
    console.log(header('Thoughts'))
    for (const t of response.thoughts) {
      console.log(`${DIM}${t.thinking}${RESET}`)
    }
  }

  if (!silentToolResponse && response.tool_history && response.tool_history.length > 0) {
    console.log(header('Tool Calls'))
    for (const tool of response.tool_history) {
      console.log(`${toolLabel(tool.name)} input: ${JSON.stringify(tool.input)}`)
      if (tool.result !== undefined) {
        console.log(`         result: ${tool.result}`)
      }
    }
  }

  console.log(header('Agent Response'))
  console.log(response.content)

  if (!silentUsage && response.usage) {
    const u = response.usage
    console.log(header('Token Usage'))
    console.log(`  Input:            ${u.input_tokens}`)
    console.log(`  Output:           ${u.output_tokens}`)
    if (u.cache_read_input_tokens !== undefined) {
      console.log(`  Cache read:       ${u.cache_read_input_tokens}`)
    }
    if (u.cache_creation_input_tokens !== undefined) {
      console.log(`  Cache creation:   ${u.cache_creation_input_tokens}`)
    }
  }
}
