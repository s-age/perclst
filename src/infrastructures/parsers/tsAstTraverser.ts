import { SyntaxKind } from 'ts-morph'
import type { SourceFile, Node } from 'ts-morph'

type ContainingSymbol = { symbol_name: string; file_path: string; line: number }

export function findContainingSymbol(
  sourceFile: SourceFile,
  filePath: string,
  line: number,
  column: number
): ContainingSymbol | null {
  const pos = sourceFile.compilerNode.getPositionOfLineAndCharacter(
    line - 1,
    Math.max(0, column - 1)
  )
  let node = sourceFile.getDescendantAtPos(pos)
  while (node) {
    const result =
      matchFunctionDeclaration(node, sourceFile, filePath) ??
      matchMethodDeclaration(node, sourceFile, filePath) ??
      matchArrowOrFunctionExpression(node, sourceFile, filePath)
    if (result) return result
    node = node.getParent()
  }
  return null
}

function matchFunctionDeclaration(
  node: Node,
  sourceFile: SourceFile,
  filePath: string
): ContainingSymbol | null {
  const fnDecl = node.asKind(SyntaxKind.FunctionDeclaration)
  if (!fnDecl) return null
  const name = fnDecl.getName()
  if (!name) return null
  return {
    symbol_name: name,
    file_path: filePath,
    line: sourceFile.getLineAndColumnAtPos(fnDecl.getStart()).line
  }
}

function matchMethodDeclaration(
  node: Node,
  sourceFile: SourceFile,
  filePath: string
): ContainingSymbol | null {
  const methodDecl = node.asKind(SyntaxKind.MethodDeclaration)
  if (!methodDecl) return null
  const className = methodDecl.getParent()?.asKind(SyntaxKind.ClassDeclaration)?.getName()
  const methodName = methodDecl.getName()
  const symbol_name = className ? `${className}.${methodName}` : methodName
  return {
    symbol_name,
    file_path: filePath,
    line: sourceFile.getLineAndColumnAtPos(methodDecl.getStart()).line
  }
}

function matchArrowOrFunctionExpression(
  node: Node,
  sourceFile: SourceFile,
  filePath: string
): ContainingSymbol | null {
  const arrowFn =
    node.asKind(SyntaxKind.ArrowFunction) ?? node.asKind(SyntaxKind.FunctionExpression)
  if (!arrowFn) return null
  const varDecl = arrowFn.getParent()?.asKind(SyntaxKind.VariableDeclaration)
  if (!varDecl) return null
  return {
    symbol_name: varDecl.getName(),
    file_path: filePath,
    line: sourceFile.getLineAndColumnAtPos(varDecl.getStart()).line
  }
}
