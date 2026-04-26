export type IPipelineFileRepository = {
  moveToDone(src: string, dest: string): void
  readRaw(path: string): unknown
  write(path: string, data: unknown): void
  cleanDir(dirPath: string): void
}
