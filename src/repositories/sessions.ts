import { join } from 'path'
import type { Session } from '@src/types/session'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'
import {
  readJson,
  writeJson,
  fileExists,
  removeFile,
  listJsonFiles,
  ensureDir
} from '@src/infrastructures/fs'

export function getSessionPath(sessionsDir: string, sessionId: string): string {
  return join(sessionsDir, `${sessionId}.json`)
}

export function saveSession(sessionsDir: string, session: Session): void {
  ensureDir(sessionsDir)
  writeJson(getSessionPath(sessionsDir, session.id), session)
}

export function loadSession(sessionsDir: string, sessionId: string): Session {
  const path = getSessionPath(sessionsDir, sessionId)
  if (!fileExists(path)) {
    throw new SessionNotFoundError(sessionId)
  }
  return readJson<Session>(path)
}

export function existsSession(sessionsDir: string, sessionId: string): boolean {
  return fileExists(getSessionPath(sessionsDir, sessionId))
}

export async function deleteSession(sessionsDir: string, sessionId: string): Promise<void> {
  const path = getSessionPath(sessionsDir, sessionId)
  if (!fileExists(path)) {
    throw new SessionNotFoundError(sessionId)
  }
  await removeFile(path)
}

export function listSessions(sessionsDir: string): Session[] {
  const files = listJsonFiles(sessionsDir)
  const sessions: Session[] = []

  for (const file of files) {
    const sessionId = file.replace('.json', '')
    try {
      sessions.push(loadSession(sessionsDir, sessionId))
    } catch {
      continue
    }
  }

  return sessions.sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )
}
