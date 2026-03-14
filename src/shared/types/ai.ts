export type ChatRequest = {
  prompt: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  topK?: number
  previousEntryIds?: string[]
}

export type ChatReference = {
  id: string
  score: number
}

export type ChatResponse = {
  response: string
  references: ChatReference[]
}
