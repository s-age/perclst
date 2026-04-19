import React from 'react'
import { Box, Text } from 'ink'
import { TaskRow } from '@src/cli/components/TaskRow.js'
import type { TaskState } from './types.js'

type Props = {
  tasks: TaskState[]
  done: boolean
  error: string | null
  spinnerFrame: number
}

function renderTasks(tasks: TaskState[], depth: number, spinnerFrame: number): React.ReactNode[] {
  return tasks.flatMap((task, i) => [
    <TaskRow
      key={`${depth}-${i}`}
      index={i}
      name={task.name}
      command={task.command}
      taskType={task.taskType}
      status={task.status}
      retryCount={task.retryCount}
      maxRetries={task.maxRetries}
      spinnerFrame={spinnerFrame}
      depth={depth}
    />,
    ...(task.children ? renderTasks(task.children, depth + 1, spinnerFrame) : [])
  ])
}

export function WorkflowPanel({ tasks, done, error, spinnerFrame }: Props) {
  return (
    <Box flexDirection="column" width="40%" paddingRight={1}>
      <Text bold>Workflow</Text>
      <Text> </Text>
      {renderTasks(tasks, 0, spinnerFrame)}
      <Text> </Text>
      {done && <Text color="green">✓ Complete ({tasks.length} tasks)</Text>}
      {error !== null && <Text color="red">✗ Failed</Text>}
    </Box>
  )
}
