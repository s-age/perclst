import { join } from 'path'

export { resolve, dirname, basename, join } from 'path'

export function cwdPath(...parts: string[]): string {
  return join(process.cwd(), ...parts)
}
