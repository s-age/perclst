export type IProcedureRepository = {
  load(name: string): string
  exists(name: string): boolean
}
