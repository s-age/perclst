import type { AgentResponse } from '@src/types/agent'
import type { DisplayConfig } from '@src/types/config'
import type { DisplayOptions } from '@src/types/display'
import { DEFAULT_HEADER_COLOR, CONTEXT_WINDOW_SIZE } from '@src/constants/config'
import { ANSI } from '@src/constants/ansi'
import { logger } from '@src/utils/logger'

type PrintResponseExtra = { sessionId: string }

const { RESET, DIM, BG_GREY, FG_ON_GREY } = ANSI

function hexToAnsi(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (!m) return ''
  const [, r, g, b] = m
  return `\x1b[38;2;${parseInt(r, 16)};${parseInt(g, 16)};${parseInt(b, 16)}m`
}

function resolveColor(displayConfig?: DisplayConfig): string {
  // NO_COLOR env var (https://no-color.org/)
  if (process.env.NO_COLOR !== undefined) return ''
  if (displayConfig?.no_color) return ''
  const hex = displayConfig?.header_color ?? DEFAULT_HEADER_COLOR
  return hexToAnsi(hex)
}

function header(text: string, color: string): string {
  return color ? `\n${color}--- ${text} ---${RESET}` : `\n--- ${text} ---`
}

function greyBlock(text: string, color: string): string {
  if (color === '') return text
  const width = process.stdout.columns ?? 80
  return text
    .split('\n')
    .map((line) => {
      // eslint-disable-next-line no-control-regex
      const visibleLen = line.replace(/\x1b\[[0-9;]*m/g, '').length
      const pad = Math.max(0, width - visibleLen)
      return `${BG_GREY}${FG_ON_GREY}${line}${' '.repeat(pad)}${RESET}`
    })
    .join('\n')
}

function toolLabel(name: string, color: string): string {
  return color ? `${color}[${name}]${RESET}` : `[${name}]`
}

function formatToolResult(result: string): string {
  // Indent continuation lines so multi-line results are visually grouped
  const indent = '         '
  let text = result

  try {
    const parsed: unknown = JSON.parse(result)
    // MCP tool results come back as an array of content blocks: [{type:'text', text:'...'}]
    // Extract the text fields and try to parse each as JSON
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      (parsed[0] as { type?: string }).type === 'text'
    ) {
      const extracted = (parsed as Array<{ type: string; text?: string }>)
        .filter((b) => b.type === 'text' && b.text !== undefined)
        .map((b) => {
          try {
            return JSON.stringify(JSON.parse(b.text!), null, 2)
          } catch {
            return b.text!
          }
        })
        .join('\n')
      text = extracted
    } else {
      text = JSON.stringify(parsed, null, 2)
    }
  } catch {
    // Not JSON — display as-is
  }

  const lines = text.split('\n')
  return (
    lines[0] +
    (lines.length > 1
      ? '\n' +
        lines
          .slice(1)
          .map((l) => indent + l)
          .join('\n')
      : '')
  )
}

function printJsonResponse(response: AgentResponse, extra?: PrintResponseExtra): void {
  const cu = response.last_assistant_usage ?? response.usage
  const contextWindowTokens =
    cu.input_tokens + (cu.cache_read_input_tokens ?? 0) + (cu.cache_creation_input_tokens ?? 0)

  const obj: Record<string, unknown> = {
    session_id: extra?.sessionId ?? null,
    content: response.content,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
      context_window_tokens: contextWindowTokens
    }
  }
  if (response.message_count !== undefined) {
    obj.message_count = response.message_count
  }
  if (response.tool_history !== undefined) {
    obj.tool_history = response.tool_history
  }
  if (response.thoughts !== undefined) {
    obj.thoughts = response.thoughts
  }

  logger.print(JSON.stringify(obj))
}

export function printResponse(
  response: AgentResponse,
  opts: DisplayOptions = {},
  displayConfig?: DisplayConfig,
  extra?: PrintResponseExtra
): void {
  if (opts.format === 'json') {
    printJsonResponse(response, extra)
    return
  }
  const color = resolveColor(displayConfig)
  const silentThoughts = opts.outputOnly || opts.silentThoughts
  const silentToolResponse = opts.outputOnly || opts.silentToolResponse
  const silentUsage = opts.outputOnly || opts.silentUsage

  if (!silentThoughts && response.thoughts && response.thoughts.length > 0) {
    logger.print(header('Thoughts', color))
    for (const t of response.thoughts) {
      logger.print(`${DIM}${t.thinking}${RESET}`)
    }
  }

  if (!silentToolResponse && response.tool_history && response.tool_history.length > 0) {
    logger.print(header('Tool Calls', color))
    for (const tool of response.tool_history) {
      logger.print(`${toolLabel(tool.name, color)} input: ${JSON.stringify(tool.input)}`)
      if (tool.result !== undefined) {
        logger.print(`         result: ${formatToolResult(tool.result)}`)
      }
    }
  }

  logger.print(header('Agent Response', color))
  logger.print(greyBlock(response.content, color))

  if (!silentUsage && response.usage) {
    const u = response.usage
    const cu = response.last_assistant_usage ?? u
    logger.print(header('Token Usage', color))
    if (response.message_count !== undefined) {
      logger.print(`  Messages:         ${response.message_count}`)
    }
    logger.print(`  Input:            ${u.input_tokens}`)
    logger.print(`  Output:           ${u.output_tokens}`)
    if (u.cache_read_input_tokens !== undefined) {
      logger.print(`  Cache read:       ${u.cache_read_input_tokens}`)
    }
    if (u.cache_creation_input_tokens !== undefined) {
      logger.print(`  Cache creation:   ${u.cache_creation_input_tokens}`)
    }
    const contextTokens =
      cu.input_tokens + (cu.cache_read_input_tokens ?? 0) + (cu.cache_creation_input_tokens ?? 0)
    const pct = Math.round((contextTokens / CONTEXT_WINDOW_SIZE) * 100)
    logger.print(
      `  Context window:   ${contextTokens.toLocaleString()} / ${CONTEXT_WINDOW_SIZE.toLocaleString()} (${pct}%)`
    )
  }
}
