import { describe, it, expect } from 'vitest'
import type { SourceFile } from 'ts-morph'
import { Project } from 'ts-morph'
import { findContainingSymbol } from '../tsAstParser'

function makeSourceFile(code: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true })
  return project.createSourceFile('test.ts', code)
}

describe('findContainingSymbol', () => {
  it('finds a function declaration by line/column inside its body', () => {
    const code = `function greet(name: string): string {\n  return name\n}`
    const sf = makeSourceFile(code)
    // line 2, inside the function body
    const result = findContainingSymbol(sf, 'test.ts', 2, 3)
    expect(result?.symbol_name).toBe('greet')
    expect(result?.file_path).toBe('test.ts')
  })

  it('finds a class method using ClassName.methodName format', () => {
    const code = `class Dog {\n  bark(): void {\n    console.log('woof')\n  }\n}`
    const sf = makeSourceFile(code)
    // line 3, inside bark body
    const result = findContainingSymbol(sf, 'test.ts', 3, 5)
    expect(result?.symbol_name).toBe('Dog.bark')
  })

  it('finds an arrow function assigned to a variable', () => {
    const code = `const greet = (name: string) => {\n  return name\n}`
    const sf = makeSourceFile(code)
    // line 2, inside arrow function body
    const result = findContainingSymbol(sf, 'test.ts', 2, 3)
    expect(result?.symbol_name).toBe('greet')
  })

  it('returns null when position is outside any function', () => {
    const code = `const x = 1`
    const sf = makeSourceFile(code)
    const result = findContainingSymbol(sf, 'test.ts', 1, 1)
    expect(result).toBeNull()
  })
})
