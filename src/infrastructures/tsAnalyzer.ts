import { Project, SourceFile, SyntaxKind } from 'ts-morph'
import type {
  TypeScriptAnalysis,
  SymbolInfo,
  ImportInfo,
  ExportInfo,
  ReferenceInfo,
  TypeDefinition,
  PropertyInfo,
  MethodInfo,
  ParameterInfo
} from '@src/types/tsAnalysis'

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
      symbols: this.extractSymbols(sourceFile),
      imports: this.extractImports(sourceFile),
      exports: this.extractExports(sourceFile)
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
      // Handle "ClassName.methodName" format
      const [className, methodName] = symbolName.split('.', 2)
      const classDecl = sourceFile.getClass(className)
      if (classDecl) {
        symbol = classDecl.getMethod(methodName)
      }
    } else {
      // Handle top-level symbols
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
        const filePath = sf.getFilePath()

        if (!options?.includeTest && filePath.includes('__tests__')) {
          continue
        }

        const pos = sf.getLineAndColumnAtPos(node.getStart())
        references.push({
          file_path: filePath,
          line: pos.line,
          column: pos.column,
          snippet: node.getText()
        })
      }
    }
    return references
  }

  getTypeDefinitions(filePath: string, symbolName: string): TypeDefinition | null {
    const sourceFile = this.project.addSourceFileAtPath(filePath)
    return (
      this.extractClassDefinition(sourceFile, symbolName) ??
      this.extractInterfaceDefinition(sourceFile, symbolName) ??
      this.extractTypeAliasDefinition(sourceFile, symbolName) ??
      this.extractFunctionDefinition(sourceFile, symbolName) ??
      null
    )
  }

  private extractFunctionSymbols(sourceFile: SourceFile): SymbolInfo[] {
    return sourceFile.getFunctions().map((f) => ({
      name: f.getName() || '<anonymous>',
      kind: 'function' as const,
      line: sourceFile.getLineAndColumnAtPos(f.getStart()).line,
      type: f.getReturnType().getText()
    }))
  }

  private extractClassSymbols(sourceFile: SourceFile): SymbolInfo[] {
    return sourceFile.getClasses().map((c) => {
      const ctor = c.getConstructors()[0]
      const constructorParams = ctor?.getParameters().map(
        (p): ParameterInfo => ({
          name: p.getName(),
          type: p.getTypeNode()?.getText() ?? p.getType().getText()
        })
      )
      const methods = c
        .getMethods()
        .filter(
          (m) =>
            !m.hasModifier(SyntaxKind.PrivateKeyword) && !m.hasModifier(SyntaxKind.ProtectedKeyword)
        )
        .map(
          (m): MethodInfo => ({
            name: m.getName(),
            parameters: m.getParameters().map(
              (p): ParameterInfo => ({
                name: p.getName(),
                type: p.getTypeNode()?.getText() ?? p.getType().getText()
              })
            ),
            returnType: m.getReturnTypeNode()?.getText() ?? m.getReturnType().getText(),
            isStatic: m.isStatic()
          })
        )
      return {
        name: c.getName() || '<anonymous>',
        kind: 'class' as const,
        line: sourceFile.getLineAndColumnAtPos(c.getStart()).line,
        ...(constructorParams?.length ? { constructorParams } : {}),
        ...(methods.length ? { methods } : {})
      }
    })
  }

  private extractScalarSymbols(sourceFile: SourceFile): SymbolInfo[] {
    const symbols: SymbolInfo[] = []
    sourceFile.getVariableDeclarations().forEach((v) => {
      symbols.push({
        name: v.getName(),
        kind: 'variable',
        line: sourceFile.getLineAndColumnAtPos(v.getStart()).line,
        type: v.getType().getText()
      })
    })
    sourceFile.getInterfaces().forEach((i) => {
      symbols.push({
        name: i.getName(),
        kind: 'interface',
        line: sourceFile.getLineAndColumnAtPos(i.getStart()).line
      })
    })
    sourceFile.getTypeAliases().forEach((t) => {
      symbols.push({
        name: t.getName(),
        kind: 'type',
        line: sourceFile.getLineAndColumnAtPos(t.getStart()).line
      })
    })
    return symbols
  }

  private extractSymbols(sourceFile: SourceFile): SymbolInfo[] {
    return [
      ...this.extractFunctionSymbols(sourceFile),
      ...this.extractClassSymbols(sourceFile),
      ...this.extractScalarSymbols(sourceFile)
    ]
  }

  private extractImports(sourceFile: SourceFile): ImportInfo[] {
    return sourceFile.getImportDeclarations().map((importDecl) => {
      const imported: string[] = []
      importDecl.getNamedImports().forEach((ni) => imported.push(ni.getName()))
      const defaultImport = importDecl.getDefaultImport()
      if (defaultImport) imported.push(defaultImport.getText())
      return { source: importDecl.getModuleSpecifierValue(), imported }
    })
  }

  private extractExports(sourceFile: SourceFile): ExportInfo[] {
    const exports: ExportInfo[] = []

    sourceFile.getExportDeclarations().forEach((exportDecl) => {
      exportDecl
        .getNamedExports()
        .forEach((ne) => exports.push({ name: ne.getName(), kind: 'export' }))
    })
    sourceFile.getFunctions().forEach((f) => {
      if (f.isExported()) exports.push({ name: f.getName() || '<anonymous>', kind: 'function' })
    })
    sourceFile.getClasses().forEach((c) => {
      if (c.isExported()) exports.push({ name: c.getName() || '<anonymous>', kind: 'class' })
    })
    sourceFile.getInterfaces().forEach((i) => {
      if (i.isExported()) exports.push({ name: i.getName(), kind: 'interface' })
    })

    return exports
  }

  private extractClassDefinition(
    sourceFile: SourceFile,
    symbolName: string
  ): TypeDefinition | null {
    const classDecl = sourceFile.getClass(symbolName)
    if (!classDecl) return null
    return {
      name: symbolName,
      type: 'class',
      properties: classDecl.getProperties().map(
        (p): PropertyInfo => ({
          name: p.getName(),
          type: p.getTypeNode()?.getText() ?? p.getType().getText(),
          isStatic: p.isStatic(),
          isReadonly: p.isReadonly()
        })
      ),
      methods: classDecl.getMethods().map(
        (m): MethodInfo => ({
          name: m.getName(),
          parameters: m.getParameters().map(
            (p): ParameterInfo => ({
              name: p.getName(),
              type: p.getTypeNode()?.getText() ?? p.getType().getText()
            })
          ),
          returnType: m.getReturnTypeNode()?.getText() ?? m.getReturnType().getText(),
          isStatic: m.isStatic()
        })
      )
    }
  }

  private extractInterfaceDefinition(
    sourceFile: SourceFile,
    symbolName: string
  ): TypeDefinition | null {
    const interfaceDecl = sourceFile.getInterface(symbolName)
    if (!interfaceDecl) return null
    return {
      name: symbolName,
      type: 'interface',
      properties: interfaceDecl.getProperties().map(
        (p): PropertyInfo => ({
          name: p.getName(),
          type: p.getTypeNode()?.getText() ?? p.getType().getText()
        })
      )
    }
  }

  private extractTypeAliasDefinition(
    sourceFile: SourceFile,
    symbolName: string
  ): TypeDefinition | null {
    const typeAlias = sourceFile.getTypeAlias(symbolName)
    if (!typeAlias) return null
    return {
      name: symbolName,
      type: 'type',
      returnType: typeAlias.getTypeNode()?.getText() ?? typeAlias.getType().getText()
    }
  }

  private extractFunctionDefinition(
    sourceFile: SourceFile,
    symbolName: string
  ): TypeDefinition | null {
    const functionDecl = sourceFile.getFunction(symbolName)
    if (!functionDecl) return null
    return {
      name: symbolName,
      type: 'function',
      parameters: functionDecl.getParameters().map(
        (p): ParameterInfo => ({
          name: p.getName(),
          type: p.getTypeNode()?.getText() ?? p.getType().getText()
        })
      ),
      returnType:
        functionDecl.getReturnTypeNode()?.getText() ?? functionDecl.getReturnType().getText()
    }
  }
}
