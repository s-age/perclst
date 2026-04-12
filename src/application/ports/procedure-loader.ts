export interface IProcedureLoader {
  load(procedureName: string): string
  exists(procedureName: string): boolean
}
