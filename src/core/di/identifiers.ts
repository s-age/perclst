export const TOKENS = {
  SessionRepository: Symbol.for('SessionRepository'),
  ConfigProvider: Symbol.for('ConfigProvider'),
  ProcedureLoader: Symbol.for('ProcedureLoader'),
  AgentClient: Symbol.for('AgentClient'),
  FileSystem: Symbol.for('FileSystem'),
  SessionService: Symbol.for('SessionService'),
  AgentService: Symbol.for('AgentService'),
  TypeScriptProject: Symbol.for('TypeScriptProject')
} as const
