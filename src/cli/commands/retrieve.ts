import { startCommand } from './start'

export async function retrieveCommand(keywords: string[]): Promise<void> {
  const keywordList = keywords.join(', ')
  await startCommand(
    `Search the knowledge base for the following keywords and return a structured summary of findings: ${keywordList}`,
    {
      procedure: 'meta-retrieve-knowledge',
      labels: ['retrieve'],
      outputOnly: true
    }
  )
}
