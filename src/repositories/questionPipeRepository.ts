import { tmpdir } from 'os'
import type { IQuestionPipeRepository } from '@src/repositories/ports/questionPipe'
import type { ChoiceRequest, ChoiceResult } from '@src/types/questionPipe'
import type { FsInfra } from '@src/infrastructures/fs'
import type { TtyInfra } from '@src/infrastructures/ttyInfrastructure'

type QuestionPipeFs = Pick<FsInfra, 'fileExists' | 'readText' | 'removeFileSync' | 'writeText'>

export class QuestionPipeRepository implements IQuestionPipeRepository {
  constructor(
    private fs: QuestionPipeFs,
    private tty: TtyInfra
  ) {}

  private get pipePath(): string | null {
    return process.env.PERCLST_PERMISSION_PIPE ?? null
  }

  pollRequest(): ChoiceRequest | null {
    const p = this.pipePath
    if (!p) return null
    const reqPath = `${p}.qreq`
    if (!this.fs.fileExists(reqPath)) return null
    try {
      const req = JSON.parse(this.fs.readText(reqPath)) as ChoiceRequest
      try {
        this.fs.removeFileSync(reqPath)
      } catch {
        /* ignore */
      }
      return req
    } catch {
      return null
    }
  }

  respond(result: ChoiceResult): void {
    const p = this.pipePath
    if (!p) return
    try {
      this.fs.writeText(`${p}.qres`, JSON.stringify(result))
    } catch {
      /* ignore */
    }
  }

  async askChoice(args: ChoiceRequest): Promise<ChoiceResult> {
    const pipePath = process.env.PERCLST_PERMISSION_PIPE
    if (pipePath) return this.askViaIPC(pipePath, args)
    return this.askViaTTY(args)
  }

  private async askViaIPC(pipePath: string, args: ChoiceRequest): Promise<ChoiceResult> {
    const reqPath = `${pipePath}.qreq`
    const resPath = `${pipePath}.qres`
    this.fs.writeText(reqPath, JSON.stringify(args))
    const deadline = Date.now() + 60_000
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 100))
      if (this.fs.fileExists(resPath)) {
        try {
          const res = JSON.parse(this.fs.readText(resPath)) as ChoiceResult
          try {
            this.fs.removeFileSync(resPath)
          } catch {
            /* ignore */
          }
          return res
        } catch {
          return this.chatNeeded(args.session_id)
        }
      }
    }
    return this.chatNeeded(args.session_id)
  }

  private async askViaTTY(args: ChoiceRequest): Promise<ChoiceResult> {
    const fd = this.tty.openTty()
    if (fd === null) return this.chatNeeded(args.session_id)

    const otherIdx = args.choices.length + 1
    let selectedIdx: number | undefined
    try {
      const lines = [
        `\nQuestion: ${args.question}`,
        ...args.choices.map((c, i) => `  ${i + 1}) ${c}`),
        `  ${otherIdx}) Answer via chat`,
        `\nSelect [1-${otherIdx}]: `
      ]
      this.tty.writeTty(fd, lines.join('\n'))
      selectedIdx = parseInt(this.tty.readTty(fd).trim(), 10) - 1
    } finally {
      this.tty.closeTty(fd)
    }

    if (selectedIdx !== undefined && selectedIdx >= 0 && selectedIdx < args.choices.length) {
      return { type: 'choice', selected: args.choices[selectedIdx], index: selectedIdx }
    }

    if (selectedIdx === args.choices.length && args.session_id) {
      this.writeChatSignal(args.session_id)
    }
    return this.chatNeeded(args.session_id)
  }

  consumeChatSignal(sessionId: string): boolean {
    const p = `${tmpdir()}/perclst-chat-${sessionId}`
    try {
      if (this.fs.fileExists(p)) {
        this.fs.removeFileSync(p)
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  }

  private writeChatSignal(sessionId: string): void {
    try {
      this.fs.writeText(`${tmpdir()}/perclst-chat-${sessionId}`, '')
    } catch {
      /* ignore */
    }
  }

  private chatNeeded(sessionId: string | undefined): ChoiceResult {
    return { type: 'chat_needed', session_id: sessionId ?? '' }
  }
}
