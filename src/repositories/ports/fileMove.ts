export type IFileMoveRepository = {
  moveToDone(src: string, dest: string): void
  readRawJson(path: string): unknown
}
