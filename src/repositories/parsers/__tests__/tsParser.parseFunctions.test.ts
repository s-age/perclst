import { describe, it, expect, beforeEach } from 'vitest'
import { Project } from 'ts-morph'
import { parseFunctions } from '../tsParser'

describe('parseFunctions', () => {
  let project: Project

  beforeEach(() => {
    project = new Project({ useInMemoryFileSystem: true })
  })

  it('parses standalone function declarations', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function myFunction() {
        return 42
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'myFunction',
      branchCount: 0,
      loopCount: 0,
      logicalOpCount: 0,
      catchCount: 0
    })
  })

  it('counts branch structures correctly', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function withBranches() {
        if (true) {
          return 1
        } else if (false) {
          return 2
        } else {
          return 3
        }
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].branchCount).toBeGreaterThan(0)
  })

  it('counts loop structures correctly', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function withLoops() {
        for (let i = 0; i < 10; i++) {
          console.log(i)
        }
        while (true) {
          break
        }
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].loopCount).toBeGreaterThan(0)
  })

  it('counts logical operators correctly', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function withLogicalOps() {
        if (a && b) {
          return true
        }
        if (c || d) {
          return false
        }
        return e ?? null
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].logicalOpCount).toBeGreaterThan(0)
  })

  it('counts catch clauses correctly', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function withCatch() {
        try {
          throw new Error()
        } catch (e) {
          console.error(e)
        }
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].catchCount).toBe(1)
  })

  it('parses arrow function assignments', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const myArrow = () => {
        return 42
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'myArrow'
    })
  })

  it('parses function expression assignments', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const myFunc = function() {
        return 42
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'myFunc'
    })
  })

  it('parses class methods', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      class MyClass {
        myMethod() {
          return 42
        }
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      name: 'myMethod',
      class_name: 'MyClass'
    })
  })

  it('parses multiple functions from mixed types', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function standalone() {
        return 1
      }

      const arrow = () => 2

      class MyClass {
        method() {
          return 3
        }
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(3)
    expect(result.map((f) => f.name)).toContain('standalone')
    expect(result.map((f) => f.name)).toContain('arrow')
    expect(result.map((f) => f.name)).toContain('method')
  })

  it('parses both variable and standalone function declarations', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      const varFunc = function() {
        return 1
      }

      function namedFunc() {
        return 2
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(2)
    expect(result.map((f) => f.name)).toContain('varFunc')
    expect(result.map((f) => f.name)).toContain('namedFunc')
  })

  it('tracks imported names used in functions', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      import { foo, bar } from 'module'

      function myFunc() {
        return foo() + bar()
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].referencedImports).toContain('foo')
    expect(result[0].referencedImports).toContain('bar')
  })

  it('ignores type-only imports', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      import type { MyType } from 'module'
      import { realFunc } from 'module'

      function myFunc() {
        return realFunc()
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].referencedImports).not.toContain('MyType')
    expect(result[0].referencedImports).toContain('realFunc')
  })

  it('reports correct line numbers', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      function first() {
        return 1
      }

      function second() {
        return 2
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(2)
    expect(result[0].lineno).toBeLessThan(result[1].lineno)
  })

  it('returns empty array for file with no functions', () => {
    const sourceFile = project.createSourceFile('test.ts', 'const x = 42')

    const result = parseFunctions(sourceFile)

    expect(result).toEqual([])
  })

  it('tracks default and namespace imports', () => {
    const sourceFile = project.createSourceFile(
      'test.ts',
      `
      import React from 'react'
      import * as path from 'path'

      function Component() {
        return React.createElement(path.join('a', 'b'))
      }
      `
    )

    const result = parseFunctions(sourceFile)

    expect(result).toHaveLength(1)
    expect(result[0].referencedImports).toContain('React')
    expect(result[0].referencedImports).toContain('path')
  })
})
