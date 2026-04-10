#!/usr/bin/env node

import { ts_analyze, executeTsAnalyze } from './tools/ts_analyze.js'
import { ts_get_references, executeTsGetReferences } from './tools/ts_get_references.js'
import { ts_get_types, executeTsGetTypes } from './tools/ts_get_types.js'
import { MCPTool, MCPRequest, MCPResponse } from './types.js'

const TOOLS: MCPTool[] = [ts_analyze, ts_get_references, ts_get_types]

async function handleRequest(request: MCPRequest): Promise<MCPResponse> {
  const { method, params } = request

  if (method === 'tools/list') {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tools: TOOLS }, null, 2)
        }
      ]
    }
  }

  if (method === 'tools/call') {
    const toolName = params?.name
    const args = params?.arguments || {}

    switch (toolName) {
      case 'ts_analyze':
        return await executeTsAnalyze(args as { file_path: string })

      case 'ts_get_references':
        return await executeTsGetReferences(args as {
          file_path: string
          symbol_name: string
        })

      case 'ts_get_types':
        return await executeTsGetTypes(args as {
          file_path: string
          symbol_name: string
        })

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${toolName}`
            }
          ]
        }
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Unknown method: ${method}`
      }
    ]
  }
}

// MCP Server stdio protocol
async function main() {
  process.stdin.setEncoding('utf-8')

  let buffer = ''

  process.stdin.on('data', async (chunk) => {
    buffer += chunk

    // Process complete JSON objects
    let newlineIndex
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)

      if (line.trim()) {
        try {
          const request: MCPRequest = JSON.parse(line)
          const response = await handleRequest(request)

          process.stdout.write(JSON.stringify(response) + '\n')
        } catch (error) {
          console.error('Error processing request:', error)
          process.stdout.write(
            JSON.stringify({
              content: [
                {
                  type: 'text',
                  text: `Error: ${error instanceof Error ? error.message : String(error)}`
                }
              ]
            }) + '\n'
          )
        }
      }
    }
  })

  process.stdin.on('end', () => {
    process.exit(0)
  })
}

main()
