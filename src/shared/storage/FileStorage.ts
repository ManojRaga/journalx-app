import fs from 'fs-extra'
import path from 'node:path'
import { v4 as uuid } from 'uuid'

import {
  JournalEntry,
  JournalEntryUpsert,
  JournalEntrySchema,
  JournalListResponse,
  JournalListResponseSchema,
} from '../types/journal'
import { DATA_DIR, INDEX_FILE } from './constants'

export class FileStorage {
  async init() {
    await fs.ensureDir(DATA_DIR)
    if (!(await fs.pathExists(INDEX_FILE))) {
      await fs.writeJSON(INDEX_FILE, [])
    }
  }

  async listEntries(): Promise<JournalListResponse> {
    await this.init()
    const entries = await fs.readJSON(INDEX_FILE)
    return JournalListResponseSchema.parse(entries)
  }

  async getEntry(id: string): Promise<JournalEntry | null> {
    await this.init()
    const filePath = this.entryPath(id)
    if (!(await fs.pathExists(filePath))) {
      return null
    }

    const raw = await fs.readJSON(filePath)
    return JournalEntrySchema.parse(raw)
  }

  async saveEntry(payload: JournalEntryUpsert): Promise<JournalEntry> {
    await this.init()

    const now = new Date().toISOString()
    const existing = payload.id ? await this.getEntry(payload.id) : null

    const entry: JournalEntry = JournalEntrySchema.parse({
      id: existing?.id ?? uuid(),
      title: payload.title ?? existing?.title ?? 'Untitled',
      content: payload.content ?? existing?.content ?? '',
      tags: payload.tags ?? existing?.tags ?? [],
      summary: existing?.summary ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })

    await fs.writeJSON(this.entryPath(entry.id), entry, { spaces: 2 })
    await this.upsertIndex(entry)
    return entry
  }

  async deleteEntry(id: string): Promise<void> {
    await this.init()
    await fs.remove(this.entryPath(id))

    const entries = await this.listEntries()
    const filtered = entries.filter((entry) => entry.id !== id)
    await fs.writeJSON(INDEX_FILE, filtered, { spaces: 2 })
  }

  private async upsertIndex(entry: JournalEntry) {
    const entries = await this.listEntries()
    const next = entries.filter((item) => item.id !== entry.id)

    next.unshift({
      id: entry.id,
      title: entry.title,
      summary: entry.summary,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })

    await fs.writeJSON(INDEX_FILE, next, { spaces: 2 })
  }

  private entryPath(id: string) {
    return path.join(DATA_DIR, `${id}.json`)
  }
}

