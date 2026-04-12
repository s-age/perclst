import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import {
  TypeScriptAnalysis,
  SymbolInfo,
  ImportInfo,
  ExportInfo,
  ReferenceInfo,
  TypeDefinition,
  PropertyInfo,
  MethodInfo,
  ParameterInfo
} from '@src/mcp/types'

export class TypeScriptProject {
  private project: Project

  constructor(tsConfigPath?: string) {
    this.project = new Project({
      tsConfigFilePath: tsConfigPath || 'tsconfig.json',
      skipAddingFilesFromTsConfig: false
    })
  }

  analyze(filePath: string): TypeScriptAnalysis {
    const sourceFile = this.project.addSourceFileAtPath(filePath)

    return {
      file_path: filePath,
      symbols: this.getSymbols(sourceFile),
      imports: this.getImports(sourceFile),
      exports: this.getExports(sourceFile)
    }
  }

  getReferences(filePath: string, symbolName: string): ReferenceInfo[] {
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    const references: ReferenceInfo[] = []

    // Find the symbol
    const symbol = sourceFile.getFunction(symbolName) ||
                  sourceFile.getClass(symbolName) ||
                  sourceFile.getVariableDeclaration(symbolName) ||
                  sourceFile.getInterface(symbolName) ||
                  sourceFile.getTypeAlias(symbolName)

    if (!symbol) {
      return references
    }

    // Get all references
    const referencedSymbols = symbol.findReferences()

    for (const referencedSymbol of referencedSymbols) {
      for (const reference of referencedSymbol.getReferences()) {
        const node = reference.getNode()
        const sourceFile = node.getSourceFile()
        const lineAndColumn = sourceFile.getLineAndColumnAtPos(node.getStart())

        references.push({
          file_path: sourceFile.getFilePath(),
          line: lineAndColumn.line,
          column: lineAndColumn.column,
          snippet: node.getText()
        })
      }
    }

    return references
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    const sourceFile = this.project.addSourceFileAtPath(filePath)

    // Try class
    const classDecl = sourceFile.getClass(symbolName)
    if (classDecl) {
      return {
        name: symbolName,
        type: 'class',
        properties: classDecl.getProperties().map((p): PropertyInfo => ({
          name: p.getName(),
          type: p.getType().getText(),
          isStatic: p.isStatic(),
          isReadonly: p.isReadonly()
        })),
        methods: classDecl.getMethods().map((m): MethodInfo => ({
          name: m.getName(),
          parameters: m.getParameters().map((p): ParameterInfo => ({
            name: p.getName(),
            type: p.getType().getText()
          })),
          returnType: m.getReturnType().getText(),
          isStatic: m.isStatic()
        }))
      }
    }

    // Try interface
    const interfaceDecl = sourceFile.getInterface(symbolName)
    if (interfaceDecl) {
      return {
        name: symbolName,
        type: 'interface',
        properties: interfaceDecl.getProperties().map((p): PropertyInfo => ({
          name: p.getName(),
          type: p.getType().getText()
        }))
      }
    }

    // Try type alias
    const typeAlias = sourceFile.getTypeAlias(symbolName)
    if (typeAlias) {
      return {
        name: symbolName,
        type: 'type',
        returnType: typeAlias.getType().getText()
      }
    }

    // Try function
    const functionDecl = sourceFile.getFunction(symbolName)
    if (functionDecl) {
      return {
        name: symbolName,
        type: 'function',
        parameters: functionDecl.getParameters().map((p): ParameterInfo => ({
          name: p.getName(),
          type: p.getType().getText()
        })),
        returnType: functionDecl.getReturnType().getText()
      }
    }

    return null
  }

  private getSymbols(sourceFile: SourceFile): SymbolInfo[] {
    const symbols: SymbolInfo[] = []

    // Functions
    sourceFile.getFunctions().forEach((f) => {
      symbols.push({
        name: f.getName() || '<anonymous>',
        kind: 'function',
        line: sourceFile.getLineAndColumnAtPos(f.getStart()).line,
        type: f.getReturnType().getText()
      })
    })

    // Classes
    sourceFile.getClasses().forEach((c) => {
      symbols.push({
        name: c.getName() || '<anonymous>',
        kind: 'class',
        line: sourceFile.getLineAndColumnAtPos(c.getStart()).line
      })
    })

    // Interfaces
    sourceFile.getInterfaces().forEach((i) => {
      symbols.push({
        name: i.getName(),
        kind: 'interface',
        line: sourceFile.getLineAndColumnAtPos(i.getStart()).line
      })
    })

    // Type aliases
    sourceFile.getTypeAliases().forEach((t) => {
      symbols.push({
        name: t.getName(),
        kind: 'type',
        line: sourceFile.getLineAndColumnAtPos(t.getStart()).line
      })
    })

    return symbols
  }

  private getImports(sourceFile: SourceFile): ImportInfo[] {
    const imports: ImportInfo[] = []

    sourceFile.getImportDeclarations().forEach((importDecl) => {
      const moduleSpecifier = importDecl.getModuleSpecifierValue()
      const imported: string[] = []

      importDecl.getNamedImports().forEach((namedImport) => {
        imported.push(namedImport.getName())
      })

      const defaultImport = importDecl.getDefaultImport()
      if (defaultImport) {
        imported.push(defaultImport.getText())
      }

      imports.push({
        source: moduleSpecifier,
        imported
      })
    })

    return imports
  }

  private getExports(sourceFile: SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = []

    // Export declarations
    sourceFile.getExportDeclarations().forEach((exportDecl) => {
      exportDecl.getNamedExports().forEach((namedExport) => {
        exports.push({
          name: namedExport.getName(),
          kind: 'export'
        })
      })
    })

    // Exported symbols
    sourceFile.getFunctions().forEach((f) => {
      if (f.isExported()) {
        exports.push({
          name: f.getName() || '<anonymous>',
          kind: 'function'
        })
      }
    })

    sourceFile.getClasses().forEach((c) => {
      if (c.isExported()) {
        exports.push({
          name: c.getName() || '<anonymous>',
          kind: 'class'
        })
      }
    })

    sourceFile.getInterfaces().forEach((i) => {
      if (i.isExported()) {
        exports.push({
          name: i.getName(),
          kind: 'interface'
        })
      }
    })

    return exports
  }
}
