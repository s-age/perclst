export type CallGraphNode = {
  filePath: string | null
  symbolName: string | null
  externalName?: string
  kind: 'local' | 'di' | 'external' | 'circular' | 'max_depth'
  children: CallGraphNode[]
}

export type Callee = {
  filePath: string | null
  symbolName: string | null
  externalName?: string
  kind: 'local' | 'di' | 'external'
}
