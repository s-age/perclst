import React from 'react'
import { Box, Text } from 'ink'
import { formatInputSummary, PERM_PANEL_ROWS } from './utils.js'
import type { PermissionRequest } from './types.js'

type Props = {
  permRequest: PermissionRequest | null
}

export function PermissionPanel({ permRequest }: Props) {
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
      <Text bold color={permRequest ? 'yellow' : 'gray'}>
        Permission{permRequest ? ' Request' : ''}
      </Text>
      <Text> </Text>
      {permRequest ? (
        <>
          <Text>
            {' '}
            Tool : <Text color="cyan">{permRequest.tool_name}</Text>
          </Text>
          <Text wrap="truncate"> Input: {formatInputSummary(permRequest.input)}</Text>
          <Text> </Text>
          <Text color="yellow"> Allow? [y/N] </Text>
        </>
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
