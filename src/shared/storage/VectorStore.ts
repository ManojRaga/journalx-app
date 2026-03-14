import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import OpenAI from 'openai'
import type { JournalEntry } from '../types/journal'
import { VECTOR_DIR } from './constants'

const require = createRequire(import.meta.url)

let IndexFlatIP: any = null

async function ensureFaissBinary() {
  const targetDir = path.join(process.cwd(), 'build')
  const targetPath = path.join(targetDir, 'faiss-node.node')
  if (await fs.pathExists(targetPath)) return

  let sourcePath: string | null = null
  try {
    const modulePath = require.resolve('faiss-node')
    sourcePath = path.join(path.dirname(modulePath), 'build', 'Release', 'faiss-node.node')
  } catch {
    throw new Error('faiss-node module not found. Please install faiss-node.')
  }

  if (!(await fs.pathExists(sourcePath))) {
    throw new Error(`faiss-node binary missing at ${sourcePath}`)
  }

  await fs.ensureDir(targetDir)
  await fs.copyFile(sourcePath, targetPath)
}

async function loadFaiss() {
  if (IndexFlatIP) return IndexFlatIP
  await ensureFaissBinary()
  const module = await import('faiss-node')
  IndexFlatIP = module.default?.IndexFlatIP ?? module.IndexFlatIP
  return IndexFlatIP
}

// Provide CommonJS globals expected by faiss-node when running in ESM
const esmFilename = fileURLToPath(import.meta.url)
const esmDirname = path.dirname(esmFilename)
const globalAny = globalThis as { __filename?: string; __dirname?: string }
if (!globalAny.__filename) globalAny.__filename = esmFilename
if (!globalAny.__dirname) globalAny.__dirname = esmDirname

const INDEX_PATH = path.join(VECTOR_DIR, 'journal.index')
const METADATA_PATH = path.join(VECTOR_DIR, 'journal.meta.json')
const EMBEDDING_MODEL = 'text-embedding-3-small'

type EntryMetadata = { id: string; title: string; content: string }

export class VectorStore {
  private index: any = null
  private metadata: EntryMetadata[] = []
  private lastFingerprint: string = ''

  private computeFingerprint(entries: JournalEntry[]): string {
    // Fast hash based on entry ids, titles, and content lengths + last modified timestamps
    return entries
      .map((e) => `${e.id}:${e.title.length}:${e.content.length}:${e.updatedAt}`)
      .sort()
      .join('|')
  }

  private async embed(texts: string[], apiKey: string): Promise<number[][]> {
    const client = new OpenAI({ apiKey })
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
    })
    return response.data.map((item) => item.embedding)
  }

  async rebuild(entries: JournalEntry[], apiKey: string) {
    if (entries.length === 0) return

    const fingerprint = this.computeFingerprint(entries)
    if (fingerprint === this.lastFingerprint && this.index) return

    const FaissIndex = await loadFaiss()
    const texts = entries.map((e) => `${e.title}\n\n${e.content}`)
    const embeddings = await this.embed(texts, apiKey)

    const dimension = embeddings[0].length
    this.index = new FaissIndex(dimension)

    for (const embedding of embeddings) {
      this.index.add(embedding)
    }

    this.metadata = entries.map((e) => ({ id: e.id, title: e.title, content: `${e.title}\n\n${e.content}` }))
    this.lastFingerprint = fingerprint

    await fs.ensureDir(VECTOR_DIR)
    this.index.write(INDEX_PATH)
    await fs.writeJSON(METADATA_PATH, this.metadata, { spaces: 2 })
  }

  async search(query: string, topK: number, apiKey: string) {
    if (!this.index || this.metadata.length === 0) {
      return []
    }

    const [queryEmbedding] = await this.embed([query], apiKey)
    const k = Math.min(topK, this.metadata.length)
    const result = this.index.search(queryEmbedding, k)

    return result.labels.map((idx: number, i: number) => ({
      entry: this.metadata[idx],
      score: result.distances[i],
    }))
  }
}
