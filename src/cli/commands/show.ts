import { SessionManager } from '../../lib/session/manager.js'
import { logger } from '../../lib/utils/logger.js'

export interface ShowOptions {
  format?: 'text' | 'json'
}

export async function showCommand(sessionId: string, options: ShowOptions) {
  try {
    const sessionManager = new SessionManager()
    const session = await sessionManager.get(sessionId)

    if (options.format === 'json') {
      console.log(JSON.stringify(session, null, 2))
      return
    }

    // Text format
    console.log(`\nSession: ${session.id}`)
    console.log(`Created: ${new Date(session.created_at).toLocaleString()}`)
    console.log(`Updated: ${new Date(session.updated_at).toLocaleString()}`)
    console.log(`Status: ${session.metadata.status}`)

    if (session.procedure) {
      console.log(`Procedure: ${session.procedure}`)
    }

    if (session.metadata.tags.length > 0) {
      console.log(`Tags: ${session.metadata.tags.join(', ')}`)
    }

    console.log(`\n--- Conversation (${session.turns.length} turns) ---\n`)

    for (const turn of session.turns) {
      const timestamp = new Date(turn.timestamp).toLocaleString()
      console.log(`[${turn.role.toUpperCase()}] ${timestamp}`)

      if (turn.thoughts && turn.thoughts.length > 0) {
        console.log('  <thinking>')
        for (const t of turn.thoughts) {
          console.log(`    ${t.thinking.replace(/\n/g, '\n    ')}`)
        }
        console.log('  </thinking>')
      }

      if (turn.tool_history && turn.tool_history.length > 0) {
        console.log('  <tool_calls>')
        for (const tool of turn.tool_history) {
          console.log(`    [${tool.name}] input: ${JSON.stringify(tool.input)}`)
          if (tool.result !== undefined) {
            const resultPreview = tool.result.length > 200
              ? tool.result.slice(0, 200) + '...'
              : tool.result
            console.log(`           result: ${resultPreview.replace(/\n/g, '\\n')}`)
          }
        }
        console.log('  </tool_calls>')
      }

      console.log(turn.content)

      if (turn.usage) {
        console.log(`(tokens: ${turn.usage.input_tokens} in / ${turn.usage.output_tokens} out)`)
      }

      console.log()
    }
  } catch (error) {
    logger.error('Failed to show session', error as Error)
    process.exit(1)
  }
}
