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

// Keywords that signal a broad query needing more context
const BROAD_QUERY_PATTERNS = /\b(summarize|summary|overview|themes?|patterns?|recurring|trend|reflect|overall|generally|month|year|lately|recently|all\s+my|across|how\s+have\s+i\s+been)\b/i

// Patterns that signal a time-bounded query
const TIME_PATTERNS: { pattern: RegExp; getDays: () => number }[] = [
  { pattern: /\b(today|this morning|tonight)\b/i, getDays: () => 1 },
  { pattern: /\byesterday\b/i, getDays: () => 2 },
  { pattern: /\b(this|past|last)\s+week\b/i, getDays: () => 7 },
  { pattern: /\b(past|last)\s+two\s+weeks\b/i, getDays: () => 14 },
  { pattern: /\b(this|past|last)\s+month\b/i, getDays: () => 30 },
  { pattern: /\b(past|last)\s+few\s+months\b/i, getDays: () => 90 },
  { pattern: /\b(this|past|last)\s+year\b/i, getDays: () => 365 },
  { pattern: /\brecently\b/i, getDays: () => 14 },
  { pattern: /\blately\b/i, getDays: () => 21 },
]

function detectDateRange(query: string): Date | null {
  for (const { pattern, getDays } of TIME_PATTERNS) {
    if (pattern.test(query)) {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - getDays())
      cutoff.setHours(0, 0, 0, 0)
      return cutoff
    }
  }
  return null
}

function detectDynamicTopK(query: string): number {
  return BROAD_QUERY_PATTERNS.test(query) ? 8 : 3
}

function formatEntryDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function buildSystemPrompt(context: string, entryCount: number): string {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let prompt = `You are Pensieve, a thoughtful and reflective journal assistant. Today is ${today}. The user has ${entryCount} journal entries.

Your role is to help the user understand their own thoughts, feelings, and patterns through their journal entries.

Guidelines:
- For casual messages (greetings, small talk), respond warmly and briefly — do NOT analyze journal data unless asked
- When the user asks about their entries, draw on the provided snippets to give direct, grounded answers
- Be temporally aware: note when entries were written, distinguish between recent and older reflections, and track how things evolve over time
- Be emotionally sensitive: journal entries are deeply personal. When entries touch on difficult topics (grief, anxiety, conflict, loss), respond with care and empathy — never be dismissive or clinical
- Look for patterns: when multiple entries are provided, notice recurring themes, mood shifts, contradictions, or growth — share these observations when relevant
- For vague questions like "how have I been?", offer a multi-angle summary across the entries available rather than fixating on a single snippet. If the entries don't cover enough ground, gently say so
- Keep responses concise but warm — be a thoughtful companion, not a report generator
- Always refer to the journal author as "you", never "the writer" or "the author"
- When quoting or referencing specific entries, mention the date so the user can place it in time`

  if (context) {
    prompt += `\n\n--- Journal Entries for Reference ---\n${context}`
  }

  return prompt
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

  setModel(model: string) {
    this.model = model
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

      // Determine dynamic topK based on query breadth
      const topK = payload.topK ?? detectDynamicTopK(payload.prompt)

      // Build search query from recent conversation context
      const recentHistory = (payload.history ?? []).slice(-4)
      const searchQuery = recentHistory.length > 0
        ? [...recentHistory.map((m) => m.content), payload.prompt].join('\n')
        : payload.prompt
      let results = await this.vectorStore.search(searchQuery, topK, apiKey!)

      // Filter by date range if the query implies a time window
      const dateCutoff = detectDateRange(payload.prompt)
      if (dateCutoff) {
        const filtered = results.filter((r) => new Date(r.entry.createdAt) >= dateCutoff)
        if (filtered.length > 0) results = filtered
      }

      // Deprioritize entries already referenced in previous turns
      const previousIds = new Set(payload.previousEntryIds ?? [])
      if (previousIds.size > 0) {
        const fresh = results.filter((r) => !previousIds.has(r.entry.id))
        const stale = results.filter((r) => previousIds.has(r.entry.id))
        results = [...fresh, ...stale].slice(0, topK)
      }

      // Format context with dates for temporal grounding
      const context = results
        .map((item) => `[${formatEntryDate(item.entry.createdAt)}] "${item.entry.title}"\n${item.entry.content}`)
        .join('\n\n---\n\n')

      const systemPrompt = buildSystemPrompt(context, validDocuments.length)

      const stream = await this.client!.chat.completions.create({
        model: this.model,
        max_completion_tokens: 4096,
        stream: true,
        messages: [
          { role: 'system' as const, content: systemPrompt },
          ...(payload.history ?? []).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
          { role: 'user' as const, content: payload.prompt },
        ],
      })

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          callbacks.onChunk(delta)
        }
      }

      callbacks.onDone(results.map((item) => ({ id: item.entry.id, score: item.score })))
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : 'Unknown error')
    }
  }
}
