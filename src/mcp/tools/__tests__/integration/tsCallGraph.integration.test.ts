import { writeFileSync } from 'fs'
import { join } from 'path'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { executeTsCallGraph } from '../../tsCallGraph'
import { setupContainer } from '@src/core/di/setup'
import { makeTmpDir, buildTestConfig } from '@src/__tests__/helpers'

describe('executeTsCallGraph (integration)', () => {
  let dir: string
  let cleanup: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    ;({ dir, cleanup } = makeTmpDir())
    setupContainer({ config: buildTestConfig(dir) })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  describe('happy path', () => {
    it('output contains funcB as a child node when funcA calls funcB', async () => {
      const fixturePath = join(dir, 'fixture.ts')
      writeFileSync(
        fixturePath,
        [
          'export function funcB(): string {',
          '  return "hello"',
          '}',
          '',
          'export function funcA(): string {',
          '  return funcB()',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toMatch(/└── .*::funcB/)
    })

    it('returns "(no calls found)" when fixture has no exported functions', async () => {
      const fixturePath = join(dir, 'no-exports.ts')
      writeFileSync(fixturePath, 'const localVar = 42\n')

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toBe('(no calls found)')
    })

    it('resolves property-access calls (obj.method())', async () => {
      const fixturePath = join(dir, 'prop-access.ts')
      writeFileSync(
        fixturePath,
        [
          'class Greeter {',
          '  greet(): string { return "hi" }',
          '}',
          '',
          'export function main(): string {',
          '  const g = new Greeter()',
          '  return g.greet()',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toMatch(/Greeter\.greet/)
    })

    it('resolves Class.method entry symbol', async () => {
      const fixturePath = join(dir, 'class-method.ts')
      writeFileSync(
        fixturePath,
        [
          'function helper(): number { return 1 }',
          '',
          'export class Service {',
          '  run(): number { return helper() }',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({
        file_path: fixturePath,
        entry: 'Service.run'
      })

      expect(result.content[0].text).toMatch(/helper/)
    })

    it('resolves arrow-function variable declarations', async () => {
      const fixturePath = join(dir, 'arrow-fn.ts')
      writeFileSync(
        fixturePath,
        [
          'function inner(): number { return 42 }',
          '',
          'export const doWork = (): number => {',
          '  return inner()',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({
        file_path: fixturePath,
        entry: 'doWork'
      })

      expect(result.content[0].text).toMatch(/inner/)
    })

    it('resolves method found by scanning classes when entry is bare method name', async () => {
      const fixturePath = join(dir, 'bare-method.ts')
      writeFileSync(
        fixturePath,
        [
          'function dep(): void {}',
          '',
          'export class Worker {',
          '  execute(): void { dep() }',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({
        file_path: fixturePath,
        entry: 'execute'
      })

      expect(result.content[0].text).toMatch(/dep/)
    })

    it('resolves interface implementations to concrete classes', async () => {
      const fixturePath = join(dir, 'iface-impl.ts')
      writeFileSync(
        fixturePath,
        [
          'interface IRepo {',
          '  save(data: string): void',
          '}',
          '',
          'class SqlRepo implements IRepo {',
          '  save(data: string): void {}',
          '}',
          '',
          'export function persist(repo: IRepo): void {',
          '  repo.save("hello")',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toMatch(/SqlRepo\.save/)
    })

    it('resolves property-access calls on local namespace imports', async () => {
      const utilsPath = join(dir, 'utils.ts')
      const mainPath = join(dir, 'ns-caller.ts')
      writeFileSync(utilsPath, 'export function helper(): number { return 1 }\n')
      writeFileSync(
        mainPath,
        [
          'import * as utils from "./utils"',
          '',
          'export function main(): number {',
          '  return utils.helper()',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: mainPath })

      expect(result.content[0].text).toMatch(/helper/)
    })

    it('resolves DI container.resolve pattern and marks callees as [di]', async () => {
      const fixturePath = join(dir, 'di-resolve.ts')
      writeFileSync(
        fixturePath,
        [
          'declare class Container { resolve<T>(): T }',
          'declare const container: Container',
          '',
          'interface IService { run(): void }',
          'class ServiceImpl implements IService { run(): void {} }',
          '',
          'export function main(): void {',
          '  const svc = container.resolve<IService>()',
          '  svc.run()',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toMatch(/ServiceImpl\.run/)
      expect(result.content[0].text).toMatch(/\[di\]/)
    })

    it('marks external identifier calls with [external]', async () => {
      const fixturePath = join(dir, 'ext-ident.ts')
      writeFileSync(
        fixturePath,
        [
          'import { join } from "path"',
          '',
          'export function buildPath(): string {',
          '  return join("a", "b")',
          '}'
        ].join('\n')
      )

      const result = await executeTsCallGraph({ file_path: fixturePath })

      expect(result.content[0].text).toMatch(/\[external\]/)
    })
  })

  describe('error path', () => {
    it('throws when the file path does not exist', async () => {
      const nonExistentPath = join(dir, 'nonexistent.ts')

      await expect(executeTsCallGraph({ file_path: nonExistentPath })).rejects.toThrow()
    })
  })
})
