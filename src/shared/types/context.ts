import type { JournalPreview, StoredSettings } from './renderer'

export interface AppDataContextValue {
  journals: JournalPreview[]
  refreshJournals: () => Promise<void>
  settings: StoredSettings | null
  refreshSettings: () => Promise<void>
  loading: boolean
}

