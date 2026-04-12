export const TOKENS = {
  SessionRepository: Symbol.for('SessionRepository'),
  ConfigProvider: Symbol.for('ConfigProvider'),
  ProcedureLoader: Symbol.for('ProcedureLoader'),
  AgentClient: Symbol.for('AgentClient'),
  ClaudeSessionReader: Symbol.for('ClaudeSessionReader'),
  FileSystem: Symbol.for('FileSystem'),
  TypeScriptProject: Symbol.for('TypeScriptProject'),
  // Domains
  SessionDomain: Symbol.for('SessionDomain'),
  AgentDomain: Symbol.for('AgentDomain'),
  AnalyzeDomain: Symbol.for('AnalyzeDomain'),
  // Services
  SessionService: Symbol.for('SessionService'),
  AgentService: Symbol.for('AgentService'),
  AnalyzeService: Symbol.for('AnalyzeService')
} as const
