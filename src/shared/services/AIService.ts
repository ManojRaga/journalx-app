import OpenAI from 'openai'
import { InMemoryStore } from '../storage/InMemoryStore'
import { VectorStore } from '../storage/VectorStore'
import type { FileStorage } from '../storage/FileStorage'
import type { JournalEntry } from '../types/journal'
import type { SettingsStorage } from '../storage/SettingsStorage'
import type { ChatRequest, ChatReference } from '../types/ai'

const DEFAULT_MODEL = 'gpt-5-nano'

type AIServiceConfig = {
  storage: FileStorage
  settings: SettingsStorage
}

type StreamCallbacks = {
  onChunk: (text: string) => void
  onDone: (references: ChatReference[]) => void
  onError: (error: string) => void
}

export class AIService {
  private readonly store = new InMemoryStore()
  private readonly vectorStore = new VectorStore()
  private client: OpenAI | null = null
  private model: string = DEFAULT_MODEL

  constructor(private readonly deps: AIServiceConfig) {}

  async configure(config: { apiKey: string; model?: string }) {
    const resolvedModel = config.model ?? DEFAULT_MODEL
    await this.store.set('apiKey', config.apiKey)
    await this.store.set('model', resolvedModel)
    await this.deps.settings.setApiKey(config.apiKey)
    await this.deps.settings.setSettings({ model: resolvedModel })

    this.client = new OpenAI({ apiKey: config.apiKey })
    this.model = resolvedModel
  }

  async clearConfiguration() {
    this.store.delete('apiKey')
    this.store.delete('model')
    this.client = null
    await this.deps.settings.clearApiKey()
  }

  private async ensureConfigured() {
    if (this.client) return

    const apiKey = this.store.get<string>('apiKey') ?? (await this.deps.settings.getApiKey())
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    this.model = this.store.get<string>('model') ?? (await this.deps.settings.getSettings()).model ?? DEFAULT_MODEL
    this.client = new OpenAI({ apiKey })
  }

  async chat(payload: ChatRequest, callbacks: StreamCallbacks): Promise<void> {
    try {
      await this.ensureConfigured()

      const entries = await this.deps.storage.listEntries()
      const documents = await Promise.all(entries.map((entry) => this.deps.storage.getEntry(entry.id)))
      const validDocuments = documents.filter(Boolean) as JournalEntry[]

      const apiKey = this.store.get<string>('apiKey') ?? (await this.deps.settings.getApiKey())
      await this.vectorStore.rebuild(validDocuments, apiKey!)

      // Build a search query enriched with recent conversation context
      // so vague follow-ups like "tell me more about it" resolve correctly
      const recentHistory = (payload.history ?? []).slice(-4)
      const searchQuery = recentHistory.length > 0
        ? [...recentHistory.map((m) => m.content), payload.prompt].join('\n')
        : payload.prompt
      const results = await this.vectorStore.search(searchQuery, payload.topK ?? 3, apiKey!)

      const context = results
        .map((item: { entry: { title: string; content: string }; score: number }) => `Title: ${item.entry.title}\n${item.entry.content}`)
        .join('\n\n')

      const systemPrompt = `You are JournalX, a concise assistant that can analyze journal entries when asked.

Rules:
- For casual messages (greetings, small talk), respond briefly and naturally — do NOT analyze journal data unless asked
- When the user asks about their journal entries, draw on the provided snippets to give direct, factual answers
- Keep responses short and to the point — avoid long lists and unsolicited suggestions
- Be conversational, not clinical
- Always refer to the journal author as "you", never "the writer" or "the author"`

      const userPrompt = context
        ? `${payload.prompt}\n\nRelevant journal snippets:\n${context}`
        : payload.prompt

      const stream = await this.client!.chat.completions.create({
        model: this.model,
        max_completion_tokens: 4096,
        stream: true,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...(payload.history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: userPrompt },
        ],
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          callbacks.onChunk(delta)
        }
      }

      callbacks.onDone(results.map((item: { entry: { id: string }; score: number }) => ({ id: item.entry.id, score: item.score })))
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : 'Unknown error')
    }
  }
}
