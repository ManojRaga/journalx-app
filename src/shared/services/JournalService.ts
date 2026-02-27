import type { FileStorage } from '../storage/FileStorage'
import { JournalEntry, JournalEntryUpsert, JournalEntryUpsertSchema } from '../types/journal'

export class JournalService {
  constructor(private readonly storage: FileStorage) {}

  async listEntries() {
    return this.storage.listEntries()
  }

  async getEntry(id: string) {
    return this.storage.getEntry(id)
  }

  async saveEntry(payload: JournalEntryUpsert): Promise<JournalEntry> {
    const parsed = JournalEntryUpsertSchema.parse(payload)
    return this.storage.saveEntry(parsed)
  }

  async deleteEntry(id: string) {
    return this.storage.deleteEntry(id)
  }
}
