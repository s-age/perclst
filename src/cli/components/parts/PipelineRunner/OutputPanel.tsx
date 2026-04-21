import React from 'react'
import { Box, Text } from 'ink'

type Props = {
  visibleLines: string[]
  lineOffset: number
  runningIndex: number
  done: boolean
  error: string | null
  hasLines: boolean
}

export function OutputPanel({
  visibleLines,
  lineOffset,
  runningIndex,
  done,
  error,
  hasLines
}: Props) {
  return (
    <Box
      flexDirection="column"
      width="60%"
      borderStyle="single"
      borderTop={false}
      borderBottom={false}
      borderRight={false}
      paddingLeft={1}
    >
      <Text bold>
        Output
        {runningIndex >= 0 && <Text color="gray"> — task {runningIndex + 1}</Text>}
      </Text>
      <Text> </Text>
      {!hasLines && !done && !error && <Text color="gray"> waiting...</Text>}
      {visibleLines.map((line, i) => (
        <Text key={lineOffset + i} color={line.startsWith('───') ? 'cyan' : 'gray'} wrap="truncate">
          {line}
        </Text>
      ))}
      {done && <Text color="green"> Pipeline complete.</Text>}
      {error !== null && <Text color="red"> Error: {error}</Text>}
    </Box>
  )
}
