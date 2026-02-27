export type ChatRequest = {
  prompt: string
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

