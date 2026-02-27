import fs from 'fs-extra'
import path from 'node:path'

import { CONFIG_FILE } from './constants'
import { SecureStore } from './SecureStore'
import type { Settings, SettingsSnapshot } from '../types/settings'

const DEFAULT_SETTINGS = {
  embeddingProvider: 'anthropic' as const,
  model: 'claude-sonnet-4-5-20250929',
}

const MODEL_MIGRATIONS: Record<string, string> = {
  'claude-4.5-sonnet': DEFAULT_SETTINGS.model,
}

export class SettingsStorage {
  private cache: Settings | null = null

  constructor(private readonly secureStore = new SecureStore()) {}

  async getSettings(): Promise<Settings> {
    if (!this.cache) {
      await fs.ensureDir(path.dirname(CONFIG_FILE))
      if (!(await fs.pathExists(CONFIG_FILE))) {
        const initial: Settings = { ...DEFAULT_SETTINGS }
        await fs.writeJSON(CONFIG_FILE, initial, { spaces: 2 })
        this.cache = initial
      } else {
        const raw = await fs.readJSON(CONFIG_FILE)
        const merged = { ...DEFAULT_SETTINGS, ...raw }
        const migratedModel = MODEL_MIGRATIONS[merged.model as string]
        if (migratedModel && migratedModel !== merged.model) {
          merged.model = migratedModel
          await fs.writeJSON(CONFIG_FILE, merged, { spaces: 2 })
        }
        this.cache = merged
      }
    }

    return this.cache!
  }

  async setSettings(partial: Partial<Settings>) {
    const current = await this.getSettings()
    const next: Settings = {
      encryptedApiKey: partial.encryptedApiKey ?? current.encryptedApiKey,
      model: partial.model ?? current.model ?? DEFAULT_SETTINGS.model,
      embeddingProvider: partial.embeddingProvider ?? current.embeddingProvider ?? DEFAULT_SETTINGS.embeddingProvider,
    }

    this.cache = next
    await fs.writeJSON(CONFIG_FILE, next, { spaces: 2 })
  }

  async setApiKey(apiKey: string) {
    if (!apiKey) return
    const encrypted = await this.secureStore.encrypt(apiKey)
    await this.setSettings({ encryptedApiKey: encrypted })
  }

  async clearApiKey() {
    await this.setSettings({ encryptedApiKey: undefined })
  }

  async getApiKey(): Promise<string | null> {
    const settings = await this.getSettings()
    if (!settings.encryptedApiKey) {
      return null
    }

    try {
      return await this.secureStore.decrypt(settings.encryptedApiKey)
    } catch (error) {
      console.error('Failed to decrypt API key', error)
      return null
    }
  }

  async snapshot(): Promise<SettingsSnapshot> {
    const settings = await this.getSettings()
    return {
      hasApiKey: Boolean(settings.encryptedApiKey),
      model: settings.model ?? DEFAULT_SETTINGS.model,
      embeddingProvider: settings.embeddingProvider ?? DEFAULT_SETTINGS.embeddingProvider,
    }
  }
}

