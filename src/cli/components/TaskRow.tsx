import React from 'react'
import { Box, Text } from 'ink'

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

type TaskRowProps = {
  index: number
  name?: string
  command?: string
  taskType: 'agent' | 'script' | 'pipeline' | 'child'
  status: 'pending' | 'running' | 'done' | 'failed' | 'retrying'
  retryCount?: number
  maxRetries?: number
  spinnerFrame?: number
  depth?: number
}

export function TaskRow({
  index,
  name,
  command,
  taskType,
  status,
  retryCount,
  maxRetries,
  spinnerFrame = 0,
  depth = 0
}: TaskRowProps): JSX.Element {
  const indent = '  '.repeat(depth)
  const num = `${index + 1}.`
  const label = name ?? command ?? `[${taskType}]`
  const typeTag = `[${taskType}]`

  if (status === 'pending') {
    return (
      <Box>
        <Text color="gray">
          {indent}○ {num} {label} {typeTag}
        </Text>
      </Box>
    )
  }

  if (status === 'running') {
    const spinner = SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length]
    return (
      <Box>
        <Text color="yellow">
          {indent}
          {spinner} {num} {label} {typeTag}
        </Text>
      </Box>
    )
  }

  if (status === 'done') {
    return (
      <Box>
        <Text color="green">
          {indent}✓ {num} {label} {typeTag}
        </Text>
      </Box>
    )
  }

  if (status === 'failed') {
    return (
      <Box>
        <Text color="red">
          {indent}✗ {num} {label} {typeTag}
        </Text>
      </Box>
    )
  }

  // retrying
  return (
    <Box>
      <Text color="yellow">
        {indent}↺ {num} {label} {typeTag}{' '}
        <Text color="gray">
          retry {retryCount}/{maxRetries}
        </Text>
      </Text>
    </Box>
  )
}
