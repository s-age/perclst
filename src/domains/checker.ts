import type { ICheckerDomain } from '@src/domains/ports/checker'
import type { ICheckerRepository } from '@src/repositories/ports/checker'
import type { CheckerOptions, CheckerResult } from '@src/types/checker'

export class CheckerDomain implements ICheckerDomain {
  constructor(private readonly checkerRepo: ICheckerRepository) {}

  async check(options: CheckerOptions): Promise<CheckerResult> {
    const cwd = options.projectRoot ?? this.checkerRepo.findProjectRoot()
    const [lint, build, test] = await Promise.all([
      this.checkerRepo.runLint(cwd, options.lintCommand),
      this.checkerRepo.runBuild(cwd, options.buildCommand),
      this.checkerRepo.runTest(cwd, options.testCommand)
    ])
    const ok = lint.exitCode === 0 && build.exitCode === 0 && test.exitCode === 0
    return { ok, lint, build, test }
  }
}
