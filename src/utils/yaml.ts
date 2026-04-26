import { parse, stringify } from 'yaml'

export function parseYaml<T>(text: string): T {
  return parse(text) as T
}

export function stringifyYaml(data: unknown): string {
  return stringify(data)
}
