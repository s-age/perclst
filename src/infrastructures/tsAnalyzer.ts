import { Project } from 'ts-morph'
import type { SourceFile } from 'ts-morph'

type TsAnalyzerOptions =
  | { skipAddingFilesFromTsConfig: true }
  | { tsConfigFilePath?: string; skipAddingFilesFromTsConfig?: false }

export class TsAnalyzer {
  private project: Project

  constructor(options: TsAnalyzerOptions = {}) {
    this.project =
      options.skipAddingFilesFromTsConfig === true
        ? new Project({ skipAddingFilesFromTsConfig: true })
        : new Project({ tsConfigFilePath: options.tsConfigFilePath ?? 'tsconfig.json' })
  }

  getSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath)
  }

  getSourceFileIfExists(filePath: string): SourceFile | undefined {
    return this.project.addSourceFileAtPathIfExists(filePath) ?? undefined
  }
}
