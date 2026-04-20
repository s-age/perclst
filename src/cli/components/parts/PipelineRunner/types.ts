import type { PipelineService, PipelineRunOptions } from '@src/services/pipelineService.js'
import type { PermissionPipeService } from '@src/services/permissionPipeService.js'
import type { Pipeline } from '@src/types/pipeline.js'
import type { Config } from '@src/types/config.js'

export type { PermissionRequest, PermissionResult } from '@src/types/permissionPipe.js'

export type TaskState = {
  name?: string
  command?: string
  taskType: 'agent' | 'script' | 'pipeline'
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
  onDone: () => void
  onError: (err: Error) => void
}
