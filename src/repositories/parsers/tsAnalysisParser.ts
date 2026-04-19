import { SyntaxKind } from 'ts-morph'
import type { Node, SourceFile, ReferencedSymbol } from 'ts-morph'
import type {
  SymbolInfo,
  ImportInfo,
  ExportInfo,
  TypeDefinition,
  PropertyInfo,
  MethodInfo,
  ParameterInfo,
  ReferenceInfo
} from '@src/types/tsAnalysis'

export function resolveSymbol(sourceFile: SourceFile, symbolName: string): Node | undefined {
  if (symbolName.includes('.')) {
    const [className, methodName] = symbolName.split('.', 2)
    return sourceFile.getClass(className)?.getMethod(methodName) ?? undefined
  }
  return (
    sourceFile.getFunction(symbolName) ??
    sourceFile.getClass(symbolName) ??
    sourceFile.getVariableDeclaration(symbolName) ??
    sourceFile.getInterface(symbolName) ??
    sourceFile.getTypeAlias(symbolName) ??
    undefined
  )
}

export function extractReferences(
  referencedSymbols: ReferencedSymbol[],
  options?: { includeTest?: boolean }
): ReferenceInfo[] {
  const results: ReferenceInfo[] = []
  for (const rs of referencedSymbols) {
    for (const ref of rs.getReferences()) {
      const node = ref.getNode()
      const sf = node.getSourceFile()
      const refFilePath = sf.getFilePath()
      if (!options?.includeTest && refFilePath.includes('__tests__')) continue
      const pos = sf.getLineAndColumnAtPos(node.getStart())
      results.push({
        file_path: refFilePath,
        line: pos.line,
        column: pos.column,
        snippet: node.getText()
      })
    }
  }
  return results
}

export function extractSymbols(sourceFile: SourceFile): SymbolInfo[] {
  return [
    ...extractFunctionSymbols(sourceFile),
    ...extractClassSymbols(sourceFile),
    ...extractScalarSymbols(sourceFile)
  ]
}

export function extractImports(sourceFile: SourceFile): ImportInfo[] {
  return sourceFile.getImportDeclarations().map((importDecl) => {
    const imported: string[] = []
    importDecl.getNamedImports().forEach((ni) => imported.push(ni.getName()))
    const defaultImport = importDecl.getDefaultImport()
    if (defaultImport) imported.push(defaultImport.getText())
    return { source: importDecl.getModuleSpecifierValue(), imported }
  })
}

export function extractExports(sourceFile: SourceFile): ExportInfo[] {
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

export function extractTypeDefinition(
  sourceFile: SourceFile,
  symbolName: string
): TypeDefinition | null {
  return (
    extractClassDefinition(sourceFile, symbolName) ??
    extractInterfaceDefinition(sourceFile, symbolName) ??
    extractTypeAliasDefinition(sourceFile, symbolName) ??
    extractFunctionDefinition(sourceFile, symbolName) ??
    null
  )
}

function extractFunctionSymbols(sourceFile: SourceFile): SymbolInfo[] {
  return sourceFile.getFunctions().map((f) => ({
    name: f.getName() || '<anonymous>',
    kind: 'function' as const,
    line: sourceFile.getLineAndColumnAtPos(f.getStart()).line,
    type: f.getReturnType().getText()
  }))
}

function extractClassSymbols(sourceFile: SourceFile): SymbolInfo[] {
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

function extractScalarSymbols(sourceFile: SourceFile): SymbolInfo[] {
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

function extractClassDefinition(sourceFile: SourceFile, symbolName: string): TypeDefinition | null {
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

function extractInterfaceDefinition(
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

function extractTypeAliasDefinition(
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

function extractFunctionDefinition(
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
