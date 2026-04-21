export type IPipelineFileRepository = {
  moveToDone(src: string, dest: string): void
  readRawJson(path: string): unknown
  writeJson(path: string, data: unknown): void
  cleanDir(dirPath: string): void
}
