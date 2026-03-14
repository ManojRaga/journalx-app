import fs from 'fs-extra'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import OpenAI from 'openai'
import type { JournalEntry } from '../types/journal'
import { APP_DIR, VECTOR_DIR } from './constants'

const require = createRequire(import.meta.url)

let IndexFlatIP: any = null

async function ensureFaissBinary() {
  const targetDir = path.join(APP_DIR, 'native')
  const targetPath = path.join(targetDir, 'faiss-node.node')
  if (await fs.pathExists(targetPath)) return

  // Packaged app: check extraResources location
  const resourcesPath = (process as any).resourcesPath
  if (resourcesPath) {
    const bundledPath = path.join(resourcesPath, 'native', 'faiss-node', 'faiss-node.node')
    if (await fs.pathExists(bundledPath)) {
      await fs.ensureDir(targetDir)
      await fs.copyFile(bundledPath, targetPath)
      return
    }
  }

  // Dev mode: resolve from node_modules
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

const MAX_CHUNK_CHARS = 1500
const MIN_CHUNK_CHARS = 100

export type ChunkMetadata = {
  id: string
  title: string
  content: string
  createdAt: string
  chunkIndex: number
}

function chunkEntry(entry: JournalEntry): { text: string; meta: ChunkMetadata }[] {
  const fullText = entry.content
  if (fullText.length <= MAX_CHUNK_CHARS) {
    return [{
      text: `${entry.title}\n\n${fullText}`,
      meta: { id: entry.id, title: entry.title, content: fullText, createdAt: entry.createdAt, chunkIndex: 0 },
    }]
  }

  // Split on double newlines (paragraph breaks), then merge small paragraphs
  const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
  const chunks: { text: string; meta: ChunkMetadata }[] = []
  let buffer = ''
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    if (buffer.length > 0 && buffer.length + paragraph.length > MAX_CHUNK_CHARS) {
      chunks.push({
        text: `${entry.title}\n\n${buffer.trim()}`,
        meta: { id: entry.id, title: entry.title, content: buffer.trim(), createdAt: entry.createdAt, chunkIndex },
      })
      chunkIndex++
      buffer = ''
    }
    buffer += (buffer ? '\n\n' : '') + paragraph
  }

  // Flush remaining buffer
  if (buffer.trim().length >= MIN_CHUNK_CHARS) {
    chunks.push({
      text: `${entry.title}\n\n${buffer.trim()}`,
      meta: { id: entry.id, title: entry.title, content: buffer.trim(), createdAt: entry.createdAt, chunkIndex },
    })
  } else if (buffer.trim().length > 0 && chunks.length > 0) {
    // Merge tiny remainder into last chunk
    const last = chunks[chunks.length - 1]
    last.text += '\n\n' + buffer.trim()
    last.meta.content += '\n\n' + buffer.trim()
  } else if (buffer.trim().length > 0) {
    chunks.push({
      text: `${entry.title}\n\n${buffer.trim()}`,
      meta: { id: entry.id, title: entry.title, content: buffer.trim(), createdAt: entry.createdAt, chunkIndex: 0 },
    })
  }

  return chunks
}

export class VectorStore {
  private index: any = null
  private metadata: ChunkMetadata[] = []
  private lastFingerprint: string = ''

  private computeFingerprint(entries: JournalEntry[]): string {
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
    const allChunks = entries.flatMap((e) => chunkEntry(e))
    const texts = allChunks.map((c) => c.text)
    const embeddings = await this.embed(texts, apiKey)

    const dimension = embeddings[0].length
    this.index = new FaissIndex(dimension)

    for (const embedding of embeddings) {
      this.index.add(embedding)
    }

    this.metadata = allChunks.map((c) => c.meta)
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
    // Fetch more chunks than needed so we can deduplicate by entry
    const k = Math.min(topK * 3, this.metadata.length)
    const result = this.index.search(queryEmbedding, k)

    // Deduplicate: keep only the best-scoring chunk per entry, up to topK entries
    const seen = new Set<string>()
    const deduped: { entry: ChunkMetadata; score: number }[] = []

    for (let i = 0; i < result.labels.length; i++) {
      const idx = result.labels[i]
      if (idx < 0) continue
      const meta = this.metadata[idx]
      if (seen.has(meta.id)) continue
      seen.add(meta.id)
      deduped.push({ entry: meta, score: result.distances[i] })
      if (deduped.length >= topK) break
    }

    return deduped
  }
}
