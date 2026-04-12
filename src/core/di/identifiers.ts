export const TOKENS = {
  TypeScriptProject: Symbol.for('TypeScriptProject'),
  // Config
  Config: Symbol.for('Config'),
  // Domains
  SessionDomain: Symbol.for('SessionDomain'),
  AgentDomain: Symbol.for('AgentDomain'),
  AnalyzeDomain: Symbol.for('AnalyzeDomain'),
  // Services
  SessionService: Symbol.for('SessionService'),
  AgentService: Symbol.for('AgentService'),
  AnalyzeService: Symbol.for('AnalyzeService'),
  // Repositories
  ClaudeCodeRepository: Symbol.for('ClaudeCodeRepository')
} as const
