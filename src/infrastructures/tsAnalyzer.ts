import { Project } from 'ts-morph'
import type { TypeScriptAnalysis, ReferenceInfo, TypeDefinition } from '@src/types/tsAnalysis'
import {
  extractSymbols,
  extractImports,
  extractExports,
  extractTypeDefinition
} from './parsers/tsSymbolExtractor'
import { findContainingSymbol } from './parsers/tsAstTraverser'

export class TsAnalyzer {
  private project: Project

  constructor(tsConfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath || 'tsconfig.json',
      skipAddingFilesFromTsConfig: false
    })
  }

  analyzeFile(filePath: string): TypeScriptAnalysis {
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    return {
      file_path: filePath,
      symbols: extractSymbols(sourceFile),
      imports: extractImports(sourceFile),
      exports: extractExports(sourceFile)
    }
  }

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

  findContainingSymbol(
    filePath: string,
    line: number,
    column: number
  ): { symbol_name: string; file_path: string; line: number } | null {
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    return findContainingSymbol(sourceFile, filePath, line, column)
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    return extractTypeDefinition(sourceFile, symbolName)
  }
}
