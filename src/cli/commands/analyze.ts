import { SessionManager } from '@src/lib/session/manager'
import { readClaudeSession } from '@src/lib/session/jsonl-reader'
import { logger } from '@src/lib/utils/logger'

export type AnalyzeOptions = {
  format?: 'text' | 'json'
  printDetail?: boolean
}

/**
 * Format a tool input as a compact single-line string.
 * Shows the most relevant field(s) for each tool.
 */
function formatToolInput(name: string, input: Record<string, unknown>): string {
  // Extract the most meaningful single value for common tools
  const primary =
    input['command'] ?? // Bash
    input['file_path'] ?? // Read, Edit, Write
    input['pattern'] ?? // Glob, Grep
    input['path'] ?? // Glob, Grep path
    input['url'] ?? // WebFetch, WebSearch
    input['query'] ?? // WebSearch, ToolSearch
    input['prompt'] ?? // Agent, Skill
    input['skill'] ?? // Skill
    input['description'] ?? // Agent
    input['task_id'] ?? // Task系
    null

  if (primary !== null) {
    return `${name}(${primary})`
  }

  // Fallback: show all keys
  const pairs = Object.entries(input)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join(', ')
  return `${name}(${pairs})`
}

export async function analyzeCommand(sessionId: string, options: AnalyzeOptions) {
  try {
    const sessionManager = new SessionManager()
    const session = await sessionManager.get(sessionId)

    const summary = readClaudeSession(session.claude_session_id, session.working_dir)

    if (options.format === 'json') {
      if (options.printDetail) {
        console.log(JSON.stringify({ session, summary }, null, 2))
      } else {
        console.log(
          JSON.stringify(
            {
              session_id: session.id,
              claude_session_id: session.claude_session_id,
              working_dir: session.working_dir,
              procedure: session.procedure ?? null,
              status: session.metadata.status,
              turns_breakdown: {
                user_instructions: summary.turnsBreakdown.userInstructions,
                tool_use: summary.turnsBreakdown.toolUse,
                assistant_response: summary.turnsBreakdown.assistantResponse,
                total: summary.turnsBreakdown.total
              },
              tool_uses: summary.toolUses.map((t) => ({
                label: formatToolInput(t.name, t.input),
                is_error: t.isError
              })),
              tokens: {
                input_total: summary.tokens.totalInput,
                output_total: summary.tokens.totalOutput,
                cache_read_total: summary.tokens.totalCacheRead,
                cache_creation_total: summary.tokens.totalCacheCreation
              }
            },
            null,
            2
          )
        )
      }
      return
    }

    // Text format
    const { turnsBreakdown: bd, toolUses, tokens } = summary

    console.log(`\n  Session: ${session.id}`)
    console.log(`  Status: ${session.metadata.status}  /  Working dir: ${session.working_dir}`)
    if (session.procedure) {
      console.log(`  Procedure: ${session.procedure}`)
    }

    console.log(`\n  Turns breakdown:`)
    console.log(`    User Instructions:  ${bd.userInstructions}`)
    console.log(`    Tool Use:          ${bd.toolUse} × 2`)
    console.log(`    Assistant Response: ${bd.assistantResponse}`)
    console.log(`    Turns:             ${bd.total}`)

    console.log(`\n  Tool uses:`)
    if (toolUses.length === 0) {
      console.log(`    (none)`)
    } else {
      for (const t of toolUses) {
        const mark = t.isError ? '✗' : '✓'
        console.log(`    ${mark}  ${formatToolInput(t.name, t.input)}`)
      }
    }

    if (options.printDetail) {
      console.log(`\n  Detail:`)
      for (let i = 0; i < summary.turns.length; i++) {
        const turn = summary.turns[i]
        if (turn.userMessage !== undefined) {
          console.log(`\n  ─── User ───`)
          console.log(`  ${turn.userMessage}`)
        }
        if (turn.thinkingBlocks && turn.thinkingBlocks.length > 0) {
          for (const t of turn.thinkingBlocks) {
            console.log(`\n  [Thinking] ${t}`)
          }
        }
        if (turn.toolCalls.length > 0) {
          for (const tc of turn.toolCalls) {
            console.log(`\n  ▶ ${formatToolInput(tc.name, tc.input)}`)
            if (tc.result !== null) {
              console.log(`    → ${tc.result}`)
            } else {
              console.log(`    → (no result)`)
            }
          }
        }
        if (turn.assistantText !== undefined) {
          console.log(`\n  ─── Assistant ───`)
          console.log(`  ${turn.assistantText}`)
        }
      }
    }

    console.log(`\n  Tokens:`)
    console.log(`    Input:   ${tokens.totalInput.toLocaleString()}`)
    console.log(`    Output:  ${tokens.totalOutput.toLocaleString()}`)
    if (tokens.totalCacheRead > 0) {
      console.log(`    Cache read (total): ${tokens.totalCacheRead.toLocaleString()}`)
    }
    if (tokens.totalCacheCreation > 0) {
      console.log(`    Cache created:      ${tokens.totalCacheCreation.toLocaleString()}`)
    }
    console.log()
  } catch (error) {
    logger.error('Failed to analyze session', error as Error)
    process.exit(1)
  }
}
