export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: string
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface MCPRequest {
  method: string
  params?: {
    name?: string
    arguments?: Record<string, unknown>
  }
}

export interface MCPResponse {
  content: Array<{
    type: string
    text?: string
  }>
}

export interface TypeScriptAnalysis {
  file_path: string
  symbols?: SymbolInfo[]
  imports?: ImportInfo[]
  exports?: ExportInfo[]
  dependencies?: string[]
}

export interface SymbolInfo {
  name: string
  kind: string
  line: number
  type?: string
}

export interface ImportInfo {
  source: string
  imported: string[]
}

export interface ExportInfo {
  name: string
  kind: string
}

export interface ReferenceInfo {
  file_path: string
  line: number
  column: number
  snippet: string
}

export interface TypeDefinition {
  name: string
  type: string
  properties?: PropertyInfo[]
  methods?: MethodInfo[]
  parameters?: ParameterInfo[]
  returnType?: string
}

export interface PropertyInfo {
  name: string
  type: string
  isStatic?: boolean
  isReadonly?: boolean
}

export interface MethodInfo {
  name: string
  parameters: ParameterInfo[]
  returnType: string
  isStatic?: boolean
}

export interface ParameterInfo {
  name: string
  type: string
}
