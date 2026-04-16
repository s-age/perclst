import { existsSync, readdirSync, readFileSync } from 'fs'
import { dirname, join, basename, extname } from 'path'
import { Project, Node, SyntaxKind } from 'ts-morph'
import type { RawFunctionInfo, TestFramework } from '@src/types/testStrategy'

// ---------------------------------------------------------------------------
// Structural count extraction — pure AST traversal, no domain logic
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

// ---------------------------------------------------------------------------
// Public: parse functions from a TypeScript file
// ---------------------------------------------------------------------------

export function parseFunctions(filePath: string): RawFunctionInfo[] | null {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  const sf = project.addSourceFileAtPathIfExists(filePath)
  if (!sf) return null

  const importedNames = new Set<string>()
  sf.getImportDeclarations().forEach((d) => {
    if (d.isTypeOnly()) return // skip `import type { ... }`
    d.getNamedImports().forEach((ni) => {
      if (!ni.isTypeOnly()) importedNames.add(ni.getName()) // skip `import { type Foo }`
    })
    const def = d.getDefaultImport()
    if (def) importedNames.add(def.getText())
    const ns = d.getNamespaceImport()
    if (ns) importedNames.add(ns.getText())
  })

  const referencedImportsIn = (node: Node): string[] => {
    const used = new Set<string>()
    node.forEachDescendant((child) => {
      if (Node.isIdentifier(child) && importedNames.has(child.getText())) {
        used.add(child.getText())
      }
    })
    return Array.from(used)
  }

  const funcs: RawFunctionInfo[] = []

  sf.getFunctions().forEach((func) => {
    const name = func.getName()
    if (!name) return
    funcs.push({
      name,
      lineno: sf.getLineAndColumnAtPos(func.getStart()).line,
      ...countStructure(func),
      referencedImports: referencedImportsIn(func)
    })
  })

  sf.getVariableStatements()
    .flatMap((vs) => vs.getDeclarations())
    .forEach((varDecl) => {
      const init = varDecl.getInitializer()
      if (!init || (!Node.isArrowFunction(init) && !Node.isFunctionExpression(init))) return
      funcs.push({
        name: varDecl.getName(),
        lineno: sf.getLineAndColumnAtPos(varDecl.getStart()).line,
        ...countStructure(init),
        referencedImports: referencedImportsIn(init)
      })
    })

  sf.getClasses().forEach((cls) => {
    const className = cls.getName()
    if (!className) return
    cls.getMethods().forEach((method) => {
      funcs.push({
        name: method.getName(),
        class_name: className,
        lineno: sf.getLineAndColumnAtPos(method.getStart()).line,
        ...countStructure(method),
        referencedImports: referencedImportsIn(method)
      })
    })
  })

  return funcs
}

// ---------------------------------------------------------------------------
// Public: test file discovery
// ---------------------------------------------------------------------------

export function findTestFile(targetFilePath: string): string | null {
  const dir = dirname(targetFilePath)
  const stem = basename(targetFilePath, extname(targetFilePath))
  const ext = extname(targetFilePath)

  const nearby = [
    join(dir, `${stem}.test${ext}`),
    join(dir, `${stem}.spec${ext}`),
    join(dir, '__tests__', `${stem}.test${ext}`),
    join(dir, '__tests__', `${stem}.spec${ext}`)
  ]
  for (const p of nearby) {
    if (existsSync(p)) return p
  }

  let current = dir
  for (let i = 0; i < 20; i++) {
    if (existsSync(join(current, '.git'))) {
      for (const testDir of ['tests', 'test', '__tests__']) {
        const found = searchDir(join(current, testDir), stem, ext)
        if (found) return found
      }
      break
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return null
}

function searchDir(dir: string, stem: string, ext: string): string | null {
  if (!existsSync(dir)) return null
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        const found = searchDir(full, stem, ext)
        if (found) return found
      } else if (entry.name === `${stem}.test${ext}` || entry.name === `${stem}.spec${ext}`) {
        return full
      }
    }
  } catch {
    // ignore permission errors
  }
  return null
}

// ---------------------------------------------------------------------------
// Public: extract test function names from a test file
// ---------------------------------------------------------------------------

export function extractTestFunctions(testFilePath: string): string[] {
  if (!existsSync(testFilePath)) return []
  const result: string[] = []
  for (const line of readFileSync(testFilePath, 'utf-8').split('\n')) {
    const s = line.trim()
    if (
      s.startsWith('it(') ||
      s.startsWith('test(') ||
      s.startsWith('it.skip(') ||
      s.startsWith('test.skip(')
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

// ---------------------------------------------------------------------------
// Public: detect test framework from package.json
// ---------------------------------------------------------------------------

export function detectFramework(targetFilePath: string): TestFramework {
  let current = dirname(targetFilePath)
  for (let i = 0; i < 20; i++) {
    const pkgPath = join(current, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<
          string,
          Record<string, string>
        >
        const deps = { ...pkg['dependencies'], ...pkg['devDependencies'] }
        if ('vitest' in deps) return 'vitest'
      } catch {
        // fall through to default
      }
      break
    }
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  return 'jest'
}
