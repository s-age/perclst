import ansis from 'ansis'
import type { AgentResponse } from '@src/types/agent'
import type { DisplayConfig } from '@src/types/config'
import type { DisplayOptions } from '@src/types/display'
import { DEFAULT_HEADER_COLOR, CONTEXT_WINDOW_SIZE } from '@src/constants/config'
import { stdout } from '@src/utils/output'

type PrintResponseExtra = { sessionId: string }

function makeDisplay(displayConfig?: DisplayConfig) {
  const noColor = process.env.NO_COLOR !== undefined || (displayConfig?.no_color ?? false)
  const hex = displayConfig?.header_color ?? DEFAULT_HEADER_COLOR

  const accent = noColor ? (s: string) => s : (s: string) => ansis.hex(hex)(s)
  const dim = noColor ? (s: string) => s : (s: string) => ansis.dim(s)

  function header(text: string): string {
    const width = process.stdout.columns ?? 80
    const label = ` ${text} `
    const right = '─'.repeat(Math.max(0, width - 2 - label.length))
    return `\n${dim('──')}${accent(label)}${dim(right)}`
  }

  function greyBlock(text: string): string {
    if (noColor) return text
    const width = process.stdout.columns ?? 80
    return text
      .split('\n')
      .map((line) => {
        // eslint-disable-next-line no-control-regex
        const visibleLen = line.replace(/\x1b\[[0-9;]*m/g, '').length
        const pad = ' '.repeat(Math.max(0, width - visibleLen))
        return ansis.bgRgb(68, 68, 68).whiteBright(line + pad)
      })
      .join('\n')
  }

  function toolLabel(name: string): string {
    return accent(`[${name}]`)
  }

  return { header, greyBlock, toolLabel, dim }
}

function formatToolResult(result: string): string {
  const indent = '         '
  let text = result

  try {
    const parsed: unknown = JSON.parse(result)
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

  stdout.print(JSON.stringify(obj))
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

  const { header, greyBlock, toolLabel, dim } = makeDisplay(displayConfig)
  const silentThoughts = opts.outputOnly || opts.silentThoughts
  const silentToolResponse = opts.outputOnly || opts.silentToolResponse
  const silentUsage = opts.outputOnly || opts.silentUsage

  if (!silentThoughts && response.thoughts && response.thoughts.length > 0) {
    stdout.print(header('Thoughts'))
    for (const t of response.thoughts) {
      stdout.print(dim(t.thinking))
    }
  }

  if (!silentToolResponse && response.tool_history && response.tool_history.length > 0) {
    stdout.print(header('Tool Calls'))
    for (const tool of response.tool_history) {
      stdout.print(`${toolLabel(tool.name)} input: ${JSON.stringify(tool.input)}`)
      if (tool.result !== undefined) {
        stdout.print(`         result: ${formatToolResult(tool.result)}`)
      }
    }
  }

  stdout.print(header('Agent Response'))
  stdout.print(greyBlock(response.content))

  if (!silentUsage && response.usage) {
    printUsageBlock(header, response)
  }
}

function printUsageBlock(header: (text: string) => string, response: AgentResponse): void {
  const u = response.usage!
  const cu = response.last_assistant_usage ?? u
  stdout.print(header('Token Usage'))
  if (response.message_count !== undefined) {
    stdout.print(`  Messages:         ${response.message_count}`)
  }
  stdout.print(`  Input:            ${u.input_tokens}`)
  stdout.print(`  Output:           ${u.output_tokens}`)
  if (u.cache_read_input_tokens !== undefined) {
    stdout.print(`  Cache read:       ${u.cache_read_input_tokens}`)
  }
  if (u.cache_creation_input_tokens !== undefined) {
    stdout.print(`  Cache creation:   ${u.cache_creation_input_tokens}`)
  }
  const contextTokens =
    cu.input_tokens + (cu.cache_read_input_tokens ?? 0) + (cu.cache_creation_input_tokens ?? 0)
  const pct = Math.round((contextTokens / CONTEXT_WINDOW_SIZE) * 100)
  stdout.print(
    `  Context window:   ${contextTokens.toLocaleString()} / ${CONTEXT_WINDOW_SIZE.toLocaleString()} (${pct}%)`
  )
}
