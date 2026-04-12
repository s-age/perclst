import { IProcedureLoader } from '@src/application/ports/procedure-loader'

export class InMemoryProcedureLoader implements IProcedureLoader {
  private procedures = new Map<string, string>()

  register(name: string, content: string): void {
    this.procedures.set(name, content)
  }

  load(procedureName: string): string {
    const content = this.procedures.get(procedureName)
    if (content === undefined) {
      throw new Error(`Procedure not found: ${procedureName}`)
    }
    return content
  }

  exists(procedureName: string): boolean {
    return this.procedures.has(procedureName)
  }
}
