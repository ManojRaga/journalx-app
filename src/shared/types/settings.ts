export type Settings = {
  encryptedApiKey?: string
  model?: string
  embeddingProvider?: 'openai' | 'anthropic'
}

export type SettingsSnapshot = {
  hasApiKey: boolean
  model: string
  embeddingProvider: 'openai' | 'anthropic'
}

