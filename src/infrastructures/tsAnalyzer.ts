import { Project } from 'ts-morph'
import type { SourceFile } from 'ts-morph'

type TsAnalyzerOptions =
  | { skipAddingFilesFromTsConfig: true }
  | { tsConfigFilePath?: string; skipAddingFilesFromTsConfig?: false }

export class TsAnalyzer {
  private _project: Project | null = null
  private readonly options: TsAnalyzerOptions

  constructor(options: TsAnalyzerOptions = {}) {
    this.options = options
  }

  private get project(): Project {
    if (!this._project) {
      if (this.options.skipAddingFilesFromTsConfig === true) {
        this._project = new Project({ skipAddingFilesFromTsConfig: true })
      } else {
        this._project = new Project({
          tsConfigFilePath: this.options.tsConfigFilePath ?? 'tsconfig.json'
        })
      }
    }
    return this._project
  }

  getSourceFile(filePath: string): SourceFile {
    return this.project.addSourceFileAtPath(filePath)
  }

  getSourceFileIfExists(filePath: string): SourceFile | undefined {
    return this.project.addSourceFileAtPathIfExists(filePath) ?? undefined
  }
}
