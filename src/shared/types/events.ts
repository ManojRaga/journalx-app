export type IpcChannels =
  | 'storage:listEntries'
  | 'storage:getEntry'
  | 'storage:saveEntry'
  | 'storage:deleteEntry'
  | 'ai:configure'
  | 'ai:clear'
  | 'ai:chat'
  | 'settings:snapshot'

export type IpcInvokePayloads = {
  'storage:listEntries': void
  'storage:getEntry': { id: string }
  'storage:saveEntry': {
    id?: string
    title: string
    content: string
    tags: string[]
  }
  'storage:deleteEntry': { id: string }
  'ai:configure': {
    apiKey: string
    model?: string
    embeddingProvider?: 'openai' | 'anthropic'
  }
  'ai:clear': void
  'ai:chat': {
    prompt: string
    topK?: number
  }
  'settings:snapshot': void
  'main-process-message': void
}

export type IpcInvokeResponses = {
  'storage:listEntries': import('./renderer').JournalPreview[]
  'storage:getEntry': import('../types/journal').JournalEntry | null
  'storage:saveEntry': import('../types/journal').JournalEntry
  'storage:deleteEntry': void
  'ai:configure': void
  'ai:clear': void
  'ai:chat': import('../types/ai').ChatResponse
  'settings:snapshot': import('./renderer').StoredSettings
}
