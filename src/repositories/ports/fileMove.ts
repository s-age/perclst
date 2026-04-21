export type IPipelineFileRepository = {
  moveToDone(src: string, dest: string): void
  readRawJson(path: string): unknown
  cleanDir(dirPath: string): void
}
