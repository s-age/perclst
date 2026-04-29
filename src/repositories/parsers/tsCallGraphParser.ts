import { Node, SyntaxKind } from 'ts-morph'
import type {
  Project,
  SourceFile,
  CallExpression,
  Symbol as TsSymbol,
  PropertyAccessExpression,
  Identifier
} from 'ts-morph'
import type { Callee } from '@src/types/tsCallGraph'

function resolveAlias(symbol: TsSymbol): TsSymbol {
  return symbol.getAliasedSymbol() ?? symbol
}

function getSymbolBody(sourceFile: SourceFile, symbolName: string): Node | undefined {
  if (symbolName.includes('.')) {
    const [className, methodName] = symbolName.split('.', 2)
    return sourceFile.getClass(className)?.getMethod(methodName)?.getBody() as Node | undefined
  }

  const fn = sourceFile.getFunction(symbolName)
  if (fn) return fn.getBody() as Node | undefined

  for (const cls of sourceFile.getClasses()) {
    const method = cls.getMethod(symbolName)
    if (method) return method.getBody() as Node | undefined
  }

  const varDecl = sourceFile.getVariableDeclaration(symbolName)
  const init = varDecl?.getInitializer()
  if (init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))) {
    return init.getBody() as Node | undefined
  }

  return undefined
}

function buildDiVariableMap(body: Node): Map<string, string> {
  const map = new Map<string, string>()
  body.getDescendantsOfKind(SyntaxKind.VariableDeclaration).forEach((varDecl) => {
    const init = varDecl.getInitializer()
    if (!init || !Node.isCallExpression(init)) return
    const expr = init.getExpression()
    if (!Node.isPropertyAccessExpression(expr) || expr.getName() !== 'resolve') return
    const typeArgs = init.getTypeArguments()
    if (typeArgs.length > 0) {
      map.set(varDecl.getName(), typeArgs[0].getText())
    }
  })
  return map
}

function resolveTypeName(decl: Node): string | undefined {
  if (!Node.isMethodSignature(decl)) return undefined
  const parent = decl.getParent()
  if (Node.isInterfaceDeclaration(parent)) return parent.getName()
  if (Node.isTypeLiteral(parent)) {
    const grandparent = parent.getParent()
    if (Node.isTypeAliasDeclaration(grandparent)) return grandparent.getName()
  }
  return undefined
}

type ImplCache = Map<string, Callee[]>
type ImplCacheEntry = { cache: ImplCache; fileCount: number }
const projectImplCache = new WeakMap<Project, ImplCacheEntry>()

function buildImplCache(project: Project): ImplCache {
  const cache: ImplCache = new Map()
  for (const sf of project.getSourceFiles()) {
    if (sf.getFilePath().includes('/node_modules/')) continue
    for (const cls of sf.getClasses()) {
      const className = cls.getName()
      if (!className) continue
      for (const impl of cls.getImplements()) {
        const typeName = impl.getExpression().getText()
        for (const method of cls.getMethods()) {
          const methodName = method.getName()
          const key = `${typeName}.${methodName}`
          let entries = cache.get(key)
          if (!entries) {
            entries = []
            cache.set(key, entries)
          }
          entries.push({
            filePath: sf.getFilePath(),
            symbolName: `${className}.${methodName}`,
            kind: 'local'
          })
        }
      }
    }
  }
  return cache
}

function findConcreteImplementations(
  decl: Node,
  methodName: string,
  sourceFile: SourceFile
): Callee[] {
  const typeName = resolveTypeName(decl)
  if (!typeName) return []

  const project = sourceFile.getProject()
  const fileCount = project.getSourceFiles().length
  const entry = projectImplCache.get(project)
  if (!entry || entry.fileCount !== fileCount) {
    const cache = buildImplCache(project)
    projectImplCache.set(project, { cache, fileCount })
    return cache.get(`${typeName}.${methodName}`) ?? []
  }

  return entry.cache.get(`${typeName}.${methodName}`) ?? []
}

function resolvePropertyAccessCall(
  expr: PropertyAccessExpression,
  diVarMap: Map<string, string>,
  sourceFile: SourceFile
): Callee[] {
  const receiverExpr = expr.getExpression()
  const methodName = expr.getName()

  if (methodName === 'resolve' && receiverExpr.getText() === 'container') return []

  const receiverText = receiverExpr.getText()
  const isDi =
    diVarMap.has(receiverText) ||
    (Node.isPropertyAccessExpression(receiverExpr) && diVarMap.has(receiverExpr.getName()))

  const rawSymbol = expr.getSymbol()
  if (!rawSymbol) return []
  const symbol = resolveAlias(rawSymbol)
  const decls = symbol.getDeclarations()
  if (!decls.length) return []

  const decl = decls[0]
  const declFilePath = decl.getSourceFile().getFilePath()

  if (declFilePath.includes('/node_modules/')) {
    return [{ filePath: null, symbolName: null, externalName: methodName, kind: 'external' }]
  }

  if (Node.isMethodSignature(decl)) {
    const impls = findConcreteImplementations(decl, methodName, sourceFile)
    if (impls.length > 0) {
      return isDi ? impls.map((i) => ({ ...i, kind: 'di' as const })) : impls
    }
  }

  const parent = decl.getParent?.()
  const className = parent && Node.isClassDeclaration(parent) ? (parent.getName() ?? null) : null
  const symbolId = className ? `${className}.${methodName}` : methodName
  return [{ filePath: declFilePath, symbolName: symbolId, kind: isDi ? 'di' : 'local' }]
}

function resolveIdentifierCall(expr: Identifier): Callee[] {
  const rawSymbol = expr.getSymbol()
  if (!rawSymbol) return []
  const symbol = resolveAlias(rawSymbol)
  const decls = symbol.getDeclarations()
  if (!decls.length) return []
  const declFilePath = decls[0].getSourceFile().getFilePath()
  if (declFilePath.includes('/node_modules/')) {
    return [{ filePath: null, symbolName: null, externalName: symbol.getName(), kind: 'external' }]
  }
  return [{ filePath: declFilePath, symbolName: symbol.getName(), kind: 'local' }]
}

function resolveCallExpression(
  call: CallExpression,
  diVarMap: Map<string, string>,
  sourceFile: SourceFile
): Callee[] {
  const expr = call.getExpression()
  if (Node.isPropertyAccessExpression(expr))
    return resolvePropertyAccessCall(expr, diVarMap, sourceFile)
  if (Node.isIdentifier(expr)) return resolveIdentifierCall(expr)
  return []
}

export function extractCallees(sourceFile: SourceFile, symbolName: string): Callee[] {
  const body = getSymbolBody(sourceFile, symbolName)
  if (!body) return []

  const diVarMap = buildDiVariableMap(body)
  const seen = new Set<string>()
  const callees: Callee[] = []

  body.getDescendantsOfKind(SyntaxKind.CallExpression).forEach((call) => {
    for (const callee of resolveCallExpression(call, diVarMap, sourceFile)) {
      const key =
        callee.kind === 'external'
          ? `external::${callee.externalName}`
          : `${callee.filePath}::${callee.symbolName}`
      if (seen.has(key)) continue
      seen.add(key)
      callees.push(callee)
    }
  })

  return callees
}
