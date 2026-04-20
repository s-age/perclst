import { Node, SyntaxKind, type SourceFile } from 'ts-morph'
import type { RawFunctionInfo } from '@src/types/testStrategy'

// ---------------------------------------------------------------------------
// Internal: structural count extraction — pure AST traversal
// ---------------------------------------------------------------------------

function countStructure(
  node: Node
): Pick<RawFunctionInfo, 'branchCount' | 'loopCount' | 'logicalOpCount' | 'catchCount'> {
  let branchCount = 0
  let loopCount = 0
  let logicalOpCount = 0
  let catchCount = 0

  node.forEachDescendant((child) => {
    switch (child.getKind()) {
      case SyntaxKind.IfStatement:
      case SyntaxKind.ConditionalExpression:
      case SyntaxKind.CaseClause:
        branchCount++
        break
      case SyntaxKind.ForStatement:
      case SyntaxKind.ForInStatement:
      case SyntaxKind.ForOfStatement:
      case SyntaxKind.WhileStatement:
      case SyntaxKind.DoStatement:
        loopCount++
        break
      case SyntaxKind.CatchClause:
        catchCount++
        break
      default:
        if (Node.isBinaryExpression(child)) {
          const op = child.getOperatorToken().getKind()
          if (
            op === SyntaxKind.AmpersandAmpersandToken ||
            op === SyntaxKind.BarBarToken ||
            op === SyntaxKind.QuestionQuestionToken
          ) {
            logicalOpCount++
          }
        }
    }
  })

  return { branchCount, loopCount, logicalOpCount, catchCount }
}

function collectImportedNames(sf: SourceFile): Set<string> {
  const names = new Set<string>()
  sf.getImportDeclarations().forEach((d) => {
    if (d.isTypeOnly()) return
    d.getNamedImports().forEach((ni) => {
      if (!ni.isTypeOnly()) names.add(ni.getName())
    })
    const def = d.getDefaultImport()
    if (def) names.add(def.getText())
    const ns = d.getNamespaceImport()
    if (ns) names.add(ns.getText())
  })
  return names
}

function makeReferencedImportsIn(importedNames: Set<string>) {
  return (node: Node): string[] => {
    const used = new Set<string>()
    node.forEachDescendant((child) => {
      if (Node.isIdentifier(child) && importedNames.has(child.getText())) {
        used.add(child.getText())
      }
    })
    return Array.from(used)
  }
}

function collectStandaloneFunctions(
  sf: SourceFile,
  referencedImportsIn: (node: Node) => string[]
): RawFunctionInfo[] {
  return sf
    .getFunctions()
    .filter((func) => func.getName() != null)
    .map((func) => ({
      name: func.getName()!,
      lineno: sf.getLineAndColumnAtPos(func.getStart()).line,
      ...countStructure(func),
      referencedImports: referencedImportsIn(func)
    }))
}

function collectVariableFunctions(
  sf: SourceFile,
  referencedImportsIn: (node: Node) => string[]
): RawFunctionInfo[] {
  return sf
    .getVariableStatements()
    .flatMap((vs) => vs.getDeclarations())
    .filter((varDecl) => {
      const init = varDecl.getInitializer()
      return init && (Node.isArrowFunction(init) || Node.isFunctionExpression(init))
    })
    .map((varDecl) => {
      const init = varDecl.getInitializer()!
      return {
        name: varDecl.getName(),
        lineno: sf.getLineAndColumnAtPos(varDecl.getStart()).line,
        ...countStructure(init),
        referencedImports: referencedImportsIn(init)
      }
    })
}

function collectClassMethods(
  sf: SourceFile,
  referencedImportsIn: (node: Node) => string[]
): RawFunctionInfo[] {
  return sf
    .getClasses()
    .filter((cls) => cls.getName() != null)
    .flatMap((cls) =>
      cls.getMethods().map((method) => ({
        name: method.getName(),
        class_name: cls.getName()!,
        lineno: sf.getLineAndColumnAtPos(method.getStart()).line,
        ...countStructure(method),
        referencedImports: referencedImportsIn(method)
      }))
    )
}

// ---------------------------------------------------------------------------
// Public: AST → RawFunctionInfo shaping
// ---------------------------------------------------------------------------

export function parseFunctions(sf: SourceFile): RawFunctionInfo[] {
  const importedNames = collectImportedNames(sf)
  const referencedImportsIn = makeReferencedImportsIn(importedNames)

  return [
    ...collectStandaloneFunctions(sf, referencedImportsIn),
    ...collectVariableFunctions(sf, referencedImportsIn),
    ...collectClassMethods(sf, referencedImportsIn)
  ]
}

// ---------------------------------------------------------------------------
// Public: raw test file content → test function names (pure, no I/O)
// ---------------------------------------------------------------------------

export function parseTestFunctionNames(content: string): string[] {
  const result: string[] = []
  for (const line of content.split('\n')) {
    const s = line.trim()
    if (
      s.startsWith('it(') ||
      s.startsWith('test(') ||
      s.startsWith('it.skip(') ||
      s.startsWith('test.skip(') ||
      s.startsWith('describe(')
    ) {
      for (const q of ["'", '"', '`']) {
        if (s.includes(q)) {
          const parts = s.split(q)
          if (parts.length >= 2) {
            result.push(parts[1])
            break
          }
        }
      }
    }
  }
  return result
}
