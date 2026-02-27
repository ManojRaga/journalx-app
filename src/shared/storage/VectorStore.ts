import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { OpenAIEmbeddings } from '@langchain/openai'
import type { JournalEntry } from '../types/journal'
import { VECTOR_DIR } from './constants'
import { SettingsStorage } from './SettingsStorage'

let FaissStore: typeof import('@langchain/community/vectorstores/faiss').FaissStore | null = null
const require = createRequire(import.meta.url)

async function ensureFaissBinary() {
  const targetDir = path.join(process.cwd(), 'build')
  const targetPath = path.join(targetDir, 'faiss-node.node')
  if (await fs.pathExists(targetPath)) {
    return
  }

  let sourcePath: string | null = null
  try {
    const modulePath = require.resolve('faiss-node')
    sourcePath = path.join(path.dirname(modulePath), 'build', 'Release', 'faiss-node.node')
  } catch (error) {
    throw new Error('faiss-node module not found. Please install faiss-node.')
  }

  if (!(await fs.pathExists(sourcePath))) {
    throw new Error(`faiss-node binary missing at ${sourcePath}`)
  }

  await fs.ensureDir(targetDir)
  await fs.copyFile(sourcePath, targetPath)
}

async function loadFaissStore() {
  if (FaissStore) return FaissStore
  await ensureFaissBinary()
  const module = await import('@langchain/community/vectorstores/faiss')
  FaissStore = module.FaissStore
  return FaissStore
}

// Provide CommonJS globals expected by faiss-node when running in ESM
const esmFilename = fileURLToPath(import.meta.url)
const esmDirname = path.dirname(esmFilename)
const globalAny = globalThis as { __filename?: string; __dirname?: string }
if (!globalAny.__filename) {
  globalAny.__filename = esmFilename
}
if (!globalAny.__dirname) {
  globalAny.__dirname = esmDirname
}

const INDEX_PATH = path.join(VECTOR_DIR, 'journal.index')
const METADATA_PATH = path.join(VECTOR_DIR, 'journal.meta.json')

export class VectorStore {
  private store: FaissStore | null = null
  private readonly settings = new SettingsStorage()

  private async getEmbeddings() {
    const apiKey = await this.settings.getApiKey()
    if (!apiKey) {
      throw new Error('Claude API key not configured; cannot build embeddings')
    }

    const openAIApiKey = process.env.OPENAI_API_KEY
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is required for embeddings')
    }

    return new OpenAIEmbeddings({
      apiKey: openAIApiKey,
      model: 'text-embedding-3-large',
    })
  }

  private async ensureStore(embeddings?: OpenAIEmbeddings) {
    if (this.store) return this.store

    const resolvedEmbeddings = embeddings ?? (await this.getEmbeddings())
    const Faiss = await loadFaissStore()

    if (await fs.pathExists(INDEX_PATH)) {
      this.store = await Faiss.load(VECTOR_DIR, resolvedEmbeddings)
    } else {
      this.store = await Faiss.fromTexts([''], [{ id: 'placeholder' }], resolvedEmbeddings)
      await fs.ensureDir(VECTOR_DIR)
      await this.store.save(VECTOR_DIR)
    }

    return this.store
  }

  async rebuild(entries: JournalEntry[]) {
    const embeddings = await this.getEmbeddings()
    const documents = entries.map((entry) => ({
      pageContent: `${entry.title}\n\n${entry.content}`,
      metadata: { id: entry.id, title: entry.title, createdAt: entry.createdAt },
    }))

    const Faiss = await loadFaissStore()
    this.store = await Faiss.fromDocuments(documents, embeddings)
    await fs.ensureDir(VECTOR_DIR)
    await this.store.save(VECTOR_DIR)
    await fs.writeJSON(METADATA_PATH, entries.map((entry) => ({ id: entry.id, title: entry.title })), { spaces: 2 })
  }

  async search(query: string, topK: number) {
    const embeddings = await this.getEmbeddings()
    const store = await this.ensureStore(embeddings)
    const results = await store.similaritySearchWithScore(query, topK)

    return results.map(([document, score]) => ({
      entry: {
        id: document.metadata.id as string,
        title: document.metadata.title as string,
        content: document.pageContent,
      },
      score,
    }))
  }
}
