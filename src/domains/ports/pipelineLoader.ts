import type { Pipeline } from '@src/types/pipeline'

export type IPipelineLoaderDomain = {
  load(absolutePath: string): Pipeline
}
