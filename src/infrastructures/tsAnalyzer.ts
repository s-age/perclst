import { Project } from 'ts-morph'
import type { SourceFile } from 'ts-morph'
import type { ReferenceInfo } from '@src/types/tsAnalysis'

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

  // Scans the entire project to find references — filesystem I/O, not pure transformation
  getReferences(
    filePath: string,
    symbolName: string,
    options?: { includeTest?: boolean }
  ): ReferenceInfo[] {
    const sourceFile = this.project.addSourceFileAtPath(filePath)

    let symbol = null
    if (symbolName.includes('.')) {
      const [className, methodName] = symbolName.split('.', 2)
      const classDecl = sourceFile.getClass(className)
      if (classDecl) {
        symbol = classDecl.getMethod(methodName)
      }
    } else {
      symbol =
        sourceFile.getFunction(symbolName) ||
        sourceFile.getClass(symbolName) ||
        sourceFile.getVariableDeclaration(symbolName) ||
        sourceFile.getInterface(symbolName) ||
        sourceFile.getTypeAlias(symbolName)
    }

    if (!symbol) return []

    const references: ReferenceInfo[] = []
    for (const referencedSymbol of symbol.findReferences()) {
      for (const reference of referencedSymbol.getReferences()) {
        const node = reference.getNode()
        const sf = node.getSourceFile()
        const refFilePath = sf.getFilePath()

        if (!options?.includeTest && refFilePath.includes('__tests__')) {
          continue
        }

        const pos = sf.getLineAndColumnAtPos(node.getStart())
        references.push({
          file_path: refFilePath,
          line: pos.line,
          column: pos.column,
          snippet: node.getText()
        })
      }
    }
    return references
  }
}
