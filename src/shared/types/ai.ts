export type ChatRequest = {
  prompt: string
  history?: { role: 'user' | 'assistant'; content: string }[]
  topK?: number
}

export type ChatReference = {
  id: string
  score: number
}

export type ChatResponse = {
  response: string
  references: ChatReference[]
}

