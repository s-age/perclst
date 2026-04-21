import { stderr } from '@src/utils/output'
import { startCommand } from './start'

const SURVEY_TOOLS = [
  'Read',
  'Glob',
  'Grep',
  'mcp__perclst__knowledge_search',
  'mcp__perclst__ts_analyze',
  'mcp__perclst__ts_get_references',
  'mcp__perclst__ts_get_types',
  'mcp__perclst__ts_checker'
]

const REFRESH_TOOLS = ['Read', 'Glob', 'Grep', 'Bash', 'Write', 'mcp__perclst__ts_analyze']

type SurveyOptions = {
  refresh?: boolean
  outputOnly?: boolean
}

export async function surveyCommand(query: string | undefined, options: SurveyOptions) {
  if (options.refresh) {
    await startCommand(
      'Refresh all codebase catalogs in .claude/skills/code-base-survey/ to reflect the current state of src/.',
      {
        procedure: 'code-base-survey-refresh',
        model: 'sonnet',
        allowedTools: REFRESH_TOOLS,
        outputOnly: options.outputOnly
      }
    )
    return
  }

  if (!query) {
    stderr.print('A query is required. Use --refresh to update catalogs instead.')
    process.exit(1)
  }

  await startCommand(query, {
    procedure: 'code-base-survey',
    model: 'sonnet',
    allowedTools: SURVEY_TOOLS,
    outputOnly: options.outputOnly
  })
}
