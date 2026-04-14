import { join } from 'path'
import type { Session, ISessionRepository } from '@src/types/session'
import { toTimestamp } from '@src/utils/date'
import { SessionNotFoundError } from '@src/errors/sessionNotFoundError'
import {
  readJson,
  writeJson,
  fileExists,
  removeFile,
  listJsonFiles,
  ensureDir
} from '@src/infrastructures/fs'

export class SessionRepository implements ISessionRepository {
  constructor(private sessionsDir: string) {}

  save(session: Session): void {
    saveSession(this.sessionsDir, session)
  }

  load(sessionId: string): Session {
    return loadSession(this.sessionsDir, sessionId)
  }

  exists(sessionId: string): boolean {
    return existsSession(this.sessionsDir, sessionId)
  }

  async delete(sessionId: string): Promise<void> {
    await deleteSession(this.sessionsDir, sessionId)
  }

  list(): Session[] {
    return listSessions(this.sessionsDir)
  }

  getPath(sessionId: string): string {
    return getSessionPath(this.sessionsDir, sessionId)
  }
}

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
      const session = loadSession(sessionsDir, sessionId)
      if (!session.id || !session.metadata) continue
      sessions.push(session)
    } catch {
      continue
    }
  }

  return sessions.sort((a, b) => toTimestamp(b.updated_at) - toTimestamp(a.updated_at))
}
