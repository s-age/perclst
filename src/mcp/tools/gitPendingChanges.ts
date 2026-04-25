import { container } from '@src/core/di/container'
import { TOKENS } from '@src/core/di/identifiers'
import type { GitPendingChangesService } from '@src/services/gitPendingChangesService'

export async function executeGitPendingChanges(args: {
  repo_path?: string
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  const service = container.resolve<GitPendingChangesService>(TOKENS.GitPendingChangesService)
  const diff = service.getPendingDiff(args.repo_path)
  const text = diff ?? '(no pending changes)'
  return { content: [{ type: 'text' as const, text }] }
}
