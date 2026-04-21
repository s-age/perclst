export type DisplayOptions = {
  silentToolResponse?: boolean
  silentThoughts?: boolean
  silentUsage?: boolean
  outputOnly?: boolean
  format?: 'text' | 'json'
}

export type TurnRow = { n: number; role: string; content: string }

export type RowFilter = {
  head?: number
  tail?: number
  order?: 'asc' | 'desc'
}
