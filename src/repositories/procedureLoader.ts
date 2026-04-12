export type IProcedureLoader = {
  load(procedureName: string): string
  exists(procedureName: string): boolean
}
