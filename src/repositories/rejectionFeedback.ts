import { resolve } from 'path'
import { fileExists, readText, removeFile, currentWorkingDir } from '@src/infrastructures/fs'

export async function getRejectionFeedback(taskName: string): Promise<string | undefined> {
  const tmpPath = resolve(`.claude/tmp/${taskName}`)
  if (!fileExists(tmpPath)) return undefined
  const feedback = readText(tmpPath)
  await removeFile(tmpPath)
  return feedback
}

export function getCwd(): string {
  return currentWorkingDir()
}
