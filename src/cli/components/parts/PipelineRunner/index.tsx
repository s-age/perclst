import React, { useEffect, useState } from 'react'
import { Box, useStdout } from 'ink'
import { WorkflowPanel } from './WorkflowPanel.js'
import { OutputPanel } from './OutputPanel.js'
import { PermissionPanel } from './PermissionPanel.js'
import { usePipelineRun } from './usePipelineRun.js'
import { usePermission } from './usePermission.js'
import { SPINNER_INTERVAL_MS, PERM_PANEL_ROWS, STREAM_HEADER_ROWS } from './utils.js'
import type { PipelineRunnerProps } from './types.js'

export function PipelineRunner({
  pipeline,
  options,
  pipelineService,
  permissionPipeService,
  onDone,
  onError
}: PipelineRunnerProps) {
  const { stdout } = useStdout()
  const termRows = stdout.rows ?? 24
  const mainRows = termRows - PERM_PANEL_ROWS
  const panelWidth = Math.max(20, Math.floor((stdout.columns ?? 80) * 0.6) - 6)

  const [spinnerFrame, setSpinnerFrame] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setSpinnerFrame((f) => f + 1), SPINNER_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const { tasks, allLines, done, error } = usePipelineRun({
    pipeline,
    options,
    pipelineService,
    panelWidth,
    onDone,
    onError
  })
  const { permRequest } = usePermission(permissionPipeService)

  const runningIndex = tasks.findIndex((t) => t.status === 'running' || t.status === 'retrying')
  const streamCapacity = Math.max(1, mainRows - STREAM_HEADER_ROWS)
  const [scrollOffset] = useState(0)
  const viewEnd = scrollOffset > 0 ? allLines.length - scrollOffset : allLines.length
  const visibleLines = allLines.slice(Math.max(0, viewEnd - streamCapacity), viewEnd)

  return (
    <Box flexDirection="column" height={termRows}>
      <Box flexDirection="row" height={mainRows}>
        <WorkflowPanel tasks={tasks} done={done} error={error} spinnerFrame={spinnerFrame} />
        <OutputPanel
          visibleLines={visibleLines}
          runningIndex={runningIndex}
          done={done}
          error={error}
          hasLines={allLines.length > 0}
        />
      </Box>
      <PermissionPanel permRequest={permRequest} />
    </Box>
  )
}
