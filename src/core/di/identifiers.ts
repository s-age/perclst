export const TOKENS = {
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
