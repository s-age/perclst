export const TOKENS = {
  TypeScriptProject: Symbol.for('TypeScriptProject'),
  // Config
  Config: Symbol.for('Config'),
  // Domains
  SessionDomain: Symbol.for('SessionDomain'),
  AgentDomain: Symbol.for('AgentDomain'),
  AnalyzeDomain: Symbol.for('AnalyzeDomain'),
  ImportDomain: Symbol.for('ImportDomain'),
  CheckerDomain: Symbol.for('CheckerDomain'),
  // Services
  SessionService: Symbol.for('SessionService'),
  AgentService: Symbol.for('AgentService'),
  AnalyzeService: Symbol.for('AnalyzeService'),
  ImportService: Symbol.for('ImportService'),
  CheckerService: Symbol.for('CheckerService'),
  // Repositories
  ClaudeCodeRepository: Symbol.for('ClaudeCodeRepository'),
  SessionRepository: Symbol.for('SessionRepository'),
  ClaudeSessionRepository: Symbol.for('ClaudeSessionRepository'),
  ProcedureRepository: Symbol.for('ProcedureRepository'),
  CheckerRepository: Symbol.for('CheckerRepository')
} as const
