import { ChatAnthropic } from '@langchain/anthropic'
import { InMemoryStore } from '../storage/InMemoryStore'
import { VectorStore } from '../storage/VectorStore'
import type { FileStorage } from '../storage/FileStorage'
import type { JournalEntry } from '../types/journal'
import type { SettingsStorage } from '../storage/SettingsStorage'
import type { ChatRequest, ChatResponse } from '../types/ai'

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'

type AIServiceConfig = {
  storage: FileStorage
  settings: SettingsStorage
}

export class AIService {
  private readonly store = new InMemoryStore()
  private readonly vectorStore = new VectorStore()
  private llm: ChatAnthropic | null = null

  constructor(private readonly deps: AIServiceConfig) {}

  async configure(config: { apiKey: string; model?: string; embeddingProvider?: 'openai' | 'anthropic' }) {
    const resolvedModel = config.model ?? DEFAULT_MODEL
    await this.store.set('apiKey', config.apiKey)
    await this.store.set('model', resolvedModel)
    await this.deps.settings.setApiKey(config.apiKey)
    await this.deps.settings.setSettings({ model: resolvedModel, embeddingProvider: config.embeddingProvider })

    this.llm = new ChatAnthropic({
      anthropicApiKey: config.apiKey,
      model: resolvedModel,
      maxTokens: 600,
    })
  }

  async clearConfiguration() {
    this.store.delete('apiKey')
    this.store.delete('model')
    this.llm = null
    await this.deps.settings.clearApiKey()
  }

  private async ensureConfigured() {
    if (this.llm) {
      return
    }

    const apiKey = this.store.get<string>('apiKey') ?? (await this.deps.settings.getApiKey())
    if (!apiKey) {
      throw new Error('Claude API key not configured')
    }

    const model = this.store.get<string>('model') ?? (await this.deps.settings.getSettings()).model ?? DEFAULT_MODEL
    this.llm = new ChatAnthropic({ anthropicApiKey: apiKey, model, maxTokens: 600 })
  }

  async chat(payload: ChatRequest): Promise<ChatResponse> {
    await this.ensureConfigured()

    const entries = await this.deps.storage.listEntries()
    const documents = await Promise.all(entries.map((entry) => this.deps.storage.getEntry(entry.id)))
    const validDocuments = documents.filter(Boolean) as JournalEntry[]

    await this.vectorStore.rebuild(validDocuments)
    const results = await this.vectorStore.search(payload.prompt, payload.topK ?? 3)

    const context = results
      .map((item) => `Title: ${item.entry.title}\nExcerpt: ${item.entry.content.slice(0, 300)}...`)
      .join('\n\n')

    const prompt = `You are JournalX, an intelligent assistant that analyzes journal data to provide informative insights.

Your approach:
- Answer questions directly and factually, drawing from the available journal entries
- Identify patterns, trends, connections, and themes across entries when relevant
- Provide helpful context, background information, or broader perspectives that enhance understanding
- Be conversational and informative while remaining objective and analytical
- Focus on useful insights rather than emotional support or therapeutic guidance

User Query: ${payload.prompt}

Relevant journal snippets:
${context || 'No related entries found.'}

Provide an informative, insightful response that helps the user understand their journal data.`

    const response = await this.llm!.invoke(prompt)
    return {
      response: response?.content?.toString() ?? '',
      references: results.map((item) => ({ id: item.entry.id, score: item.score })),
    }
  }
}

