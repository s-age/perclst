import { describe, it, expect } from 'vitest'
import type { SourceFile } from 'ts-morph'
import { Project } from 'ts-morph'
import {
  extractSymbols,
  extractImports,
  extractExports,
  extractTypeDefinition
} from '../tsAnalysisParser'

function makeSourceFile(code: string): SourceFile {
  const project = new Project({ useInMemoryFileSystem: true })
  return project.createSourceFile('test.ts', code)
}

describe('extractSymbols', () => {
  it('extracts function symbol with return type', () => {
    const sf = makeSourceFile('function greet(name: string): string { return name }')
    const symbols = extractSymbols(sf)
    expect(symbols).toContainEqual(expect.objectContaining({ name: 'greet', kind: 'function' }))
  })

  it('extracts class with public methods and constructor params', () => {
    const sf = makeSourceFile(`
      class Dog {
        constructor(private name: string) {}
        bark(): void {}
        private sleep(): void {}
      }
    `)
    const symbols = extractSymbols(sf)
    const dog = symbols.find((s) => s.name === 'Dog')
    expect(dog?.kind).toBe('class')
    expect(dog?.methods?.map((m) => m.name)).toContain('bark')
    expect(dog?.methods?.map((m) => m.name)).not.toContain('sleep')
  })

  it('extracts interface and type alias as scalar symbols', () => {
    const sf = makeSourceFile(`
      interface Foo { x: number }
      type Bar = string | number
    `)
    const symbols = extractSymbols(sf)
    expect(symbols.some((s) => s.name === 'Foo' && s.kind === 'interface')).toBe(true)
    expect(symbols.some((s) => s.name === 'Bar' && s.kind === 'type')).toBe(true)
  })
})

describe('extractImports', () => {
  it('extracts named and default imports', () => {
    const sf = makeSourceFile(`
      import path from 'path'
      import { readFile, writeFile } from 'fs'
    `)
    const imports = extractImports(sf)
    expect(imports).toContainEqual({ source: 'path', imported: ['path'] })
    expect(imports).toContainEqual({ source: 'fs', imported: ['readFile', 'writeFile'] })
  })
})

describe('extractExports', () => {
  it('extracts exported function and class', () => {
    const sf = makeSourceFile(`
      export function hello() {}
      export class World {}
    `)
    const exports = extractExports(sf)
    expect(exports.some((e) => e.name === 'hello' && e.kind === 'function')).toBe(true)
    expect(exports.some((e) => e.name === 'World' && e.kind === 'class')).toBe(true)
  })

  it('extracts named re-exports', () => {
    const sf = makeSourceFile(`export { foo, bar } from './other'`)
    const exports = extractExports(sf)
    expect(exports.some((e) => e.name === 'foo')).toBe(true)
    expect(exports.some((e) => e.name === 'bar')).toBe(true)
  })
})

describe('extractTypeDefinition', () => {
  it('returns class definition with properties and methods', () => {
    const sf = makeSourceFile(`
      class Animal {
        name: string = ''
        speak(): string { return '' }
      }
    `)
    const def = extractTypeDefinition(sf, 'Animal')
    expect(def?.type).toBe('class')
    expect(def?.properties?.some((p) => p.name === 'name')).toBe(true)
    expect(def?.methods?.some((m) => m.name === 'speak')).toBe(true)
  })

  it('returns interface definition with properties', () => {
    const sf = makeSourceFile(`interface Point { x: number; y: number }`)
    const def = extractTypeDefinition(sf, 'Point')
    expect(def?.type).toBe('interface')
    expect(def?.properties?.map((p) => p.name)).toEqual(['x', 'y'])
  })

  it('returns type alias definition', () => {
    const sf = makeSourceFile(`type Status = 'active' | 'inactive'`)
    const def = extractTypeDefinition(sf, 'Status')
    expect(def?.type).toBe('type')
  })

  it('returns function definition with parameters', () => {
    const sf = makeSourceFile(`function add(a: number, b: number): number { return a + b }`)
    const def = extractTypeDefinition(sf, 'add')
    expect(def?.type).toBe('function')
    expect(def?.parameters?.map((p) => p.name)).toEqual(['a', 'b'])
  })

  it('returns null for unknown symbol', () => {
    const sf = makeSourceFile(`const x = 1`)
    expect(extractTypeDefinition(sf, 'nonExistent')).toBeNull()
  })
})
