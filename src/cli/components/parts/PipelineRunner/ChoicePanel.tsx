import React from 'react'
import { Box, Text } from 'ink'
import { PERM_PANEL_ROWS } from './utils.js'
import type { ChoiceRequest } from '@src/types/questionPipe'

type Props = {
  choiceRequest: ChoiceRequest | null
  isTextMode: boolean
  textInput: string
}

export function ChoicePanel({ choiceRequest, isTextMode, textInput }: Props): JSX.Element {
  return (
    <Box
      flexDirection="column"
      height={PERM_PANEL_ROWS}
      borderStyle="single"
      borderLeft={false}
      borderRight={false}
      borderBottom={false}
      paddingX={1}
    >
      <Text bold color={choiceRequest ? 'cyan' : 'gray'}>
        Choice{choiceRequest ? ' Request' : ''}
      </Text>
      <Text> </Text>
      {choiceRequest ? (
        isTextMode ? (
          <>
            <Text wrap="truncate"> Q: {choiceRequest.question}</Text>
            <Text> </Text>
            <Text color="cyan"> Answer: {textInput}_</Text>
            <Text color="gray"> (Enter to confirm)</Text>
          </>
        ) : (
          <>
            <Text wrap="truncate"> {choiceRequest.question}</Text>
            <Text>
              {' '}
              {choiceRequest.choices.map((c, i) => `${i + 1}) ${c}`).join('  ')}
              {'  '}
              {choiceRequest.choices.length + 1}) Answer via chat
            </Text>
            <Text> </Text>
            <Text color="cyan"> Select [1-{choiceRequest.choices.length + 1}]: </Text>
          </>
        )
      ) : (
        <>
          <Text color="gray"> —</Text>
          <Text> </Text>
          <Text> </Text>
          <Text> </Text>
        </>
      )}
    </Box>
  )
}
