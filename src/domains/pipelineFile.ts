import type { IPipelineFileDomain } from '@src/domains/ports/pipelineFile'
import type { IPipelineFileRepository } from '@src/repositories/ports/fileMove'
import type { Pipeline } from '@src/types/pipeline'
import type { IGitRepository } from '@src/repositories/ports/git'
import { resolve, dirname, basename, join } from '@src/utils/path'

export class PipelineFileDomain implements IPipelineFileDomain {
  constructor(
    private readonly fileMoveRepo: IPipelineFileRepository,
    private readonly gitRepo: IGitRepository
  ) {}

  moveToDone(pipelinePath: string): string {
    const absoluteSrc = resolve(pipelinePath)
    const dir = dirname(absoluteSrc)
    const stem = basename(absoluteSrc, '.json')
    const segments = stem.split('__')
    const filename = segments[segments.length - 1] + '.json'
    const subDirs = segments.slice(0, -1)
    const dest = join(dir, 'done', ...subDirs, filename)
    const relativeDest = join('done', ...subDirs, filename)
    this.fileMoveRepo.moveToDone(absoluteSrc, dest)
    return relativeDest
  }

  getDiffStat(): string | null {
    return this.gitRepo.getDiffStat()
  }

  getHead(): string | null {
    return this.gitRepo.getHead()
  }

  getDiffSummary(from: string, to: string): string | null {
    return this.gitRepo.getDiffSummary(from, to)
  }

  commitMove(originalPath: string, donePath: string): void {
    try {
      const absOriginal = resolve(originalPath)
      const absDone = join(dirname(absOriginal), donePath)
      const filename = basename(donePath)
      try {
        this.gitRepo.stageUpdated(absOriginal)
      } catch {
        // not a tracked file or not a git repo
      }
      try {
        this.gitRepo.stageNew(absDone)
      } catch {
        // file may not exist yet
      }
      try {
        this.gitRepo.stageUpdated('.claude/tmp/')
      } catch {
        // no tracked tmp files to stage
      }
      this.gitRepo.commit(`chore: mv ${filename}`)
    } catch {
      // not in a git repo or nothing to commit
    }
  }

  cleanTmpDir(): void {
    this.fileMoveRepo.cleanDir('.claude/tmp/')
  }

  loadRawPipeline(absolutePath: string): unknown {
    return this.fileMoveRepo.readRawJson(absolutePath)
  }

  savePipeline(absolutePath: string, pipeline: Pipeline): void {
    this.fileMoveRepo.writeJson(absolutePath, pipeline)
  }
}
