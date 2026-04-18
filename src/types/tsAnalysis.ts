export type TypeScriptAnalysis = {
  file_path: string
  symbols?: SymbolInfo[]
  imports?: ImportInfo[]
  exports?: ExportInfo[]
  dependencies?: string[]
}

export type SymbolInfo = {
  name: string
  kind: string
  line: number
  type?: string
  constructorParams?: ParameterInfo[]
  methods?: MethodInfo[]
}

export type ImportInfo = {
  source: string
  imported: string[]
}

export type ExportInfo = {
  name: string
  kind: string
}

export type ReferenceInfo = {
  file_path: string
  line: number
  column: number
  snippet: string
}

export type TypeDefinition = {
  name: string
  type: string
  properties?: PropertyInfo[]
  methods?: MethodInfo[]
  parameters?: ParameterInfo[]
  returnType?: string
}

export type PropertyInfo = {
  name: string
  type: string
  isStatic?: boolean
  isReadonly?: boolean
}

export type MethodInfo = {
  name: string
  parameters: ParameterInfo[]
  returnType: string
  isStatic?: boolean
}

export type ParameterInfo = {
  name: string
  type: string
}
