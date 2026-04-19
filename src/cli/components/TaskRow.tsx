import React from 'react'
import { Box, Text } from 'ink'

type TaskRowProps = {
  name?: string
  taskType: 'agent' | 'script' | 'pipeline'
  status: 'pending' | 'running' | 'done' | 'failed' | 'retrying'
  retryCount?: number
  maxRetries?: number
  depth?: number
}

export function TaskRow({
  name,
  taskType,
  status,
  retryCount,
  maxRetries,
  depth = 0
}: TaskRowProps) {
  const indent = '  '.repeat(depth)
  const label = name ? `${name} [${taskType}]` : `[${taskType}]`

  if (status === 'pending') {
    return (
      <Box>
        <Text color="gray">
          {indent}○ {label}
        </Text>
      </Box>
    )
  }

  if (status === 'running') {
    return (
      <Box>
        <Text color="yellow">
          {indent}● {label} — running
        </Text>
      </Box>
    )
  }

  if (status === 'done') {
    return (
      <Box>
        <Text color="green">
          {indent}✓ {label}
        </Text>
      </Box>
    )
  }

  if (status === 'failed') {
    return (
      <Box>
        <Text color="red">
          {indent}✗ {label} — failed
        </Text>
      </Box>
    )
  }

  // retrying
  return (
    <Box>
      <Text color="yellow">
        {indent}↺ {label} — retry {retryCount}/{maxRetries}
      </Text>
    </Box>
  )
}
