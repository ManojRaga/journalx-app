export type StoredSettings = {
  hasApiKey: boolean
  model: string
  embeddingProvider: 'openai' | 'anthropic'
}

export type ConfigureAIRequest = {
  apiKey: string
  model?: string
  embeddingProvider?: 'openai' | 'anthropic'
}

export type JournalPreview = {
  id: string
  title: string
  summary: string | null
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type ChatReference = {
  id: string
  score: number
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  references?: ChatReference[]
}
