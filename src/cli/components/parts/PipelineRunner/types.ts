import type { PipelineService, PipelineRunOptions } from '@src/services/pipelineService'
import type { PermissionPipeService } from '@src/services/permissionPipeService'
import type { Pipeline } from '@src/types/pipeline'
import type { Config } from '@src/types/config'

export type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe'

export type TaskState = {
  name?: string
  command?: string
  taskType: 'agent' | 'script' | 'pipeline' | 'child'
  status: 'pending' | 'running' | 'done' | 'failed' | 'retrying'
  retryCount?: number
  maxRetries?: number
  children?: TaskState[]
}

export type PipelineRunnerProps = {
  pipeline: Pipeline
  options: PipelineRunOptions
  pipelineService: PipelineService
  permissionPipeService: PermissionPipeService | null
  config: Config
  signal: AbortSignal
  onAbort: () => void
  onDone: () => void
  onError: (err: Error) => void
}
