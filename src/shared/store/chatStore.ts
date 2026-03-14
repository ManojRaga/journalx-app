import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { ChatMessage } from '../types/renderer'

const CHAR_INTERVAL_MS = 12

interface ChatState {
  messages: ChatMessage[]
  input: string
  streamingId: string | null
  setInput: (value: string) => void
  addUserMessage: (content: string) => ChatMessage
  startAssistantMessage: () => string
  appendChunk: (chunk: string) => void
  finalizeAssistantMessage: (references: ChatMessage['references']) => void
  clear: () => void
}

let charBuffer = ''
let drainTimer: ReturnType<typeof setInterval> | null = null
let pendingFinalize: ChatMessage['references'] | null = null

function startDrain() {
  if (drainTimer) return
  drainTimer = setInterval(() => {
    if (charBuffer.length === 0) {
      clearInterval(drainTimer!)
      drainTimer = null
      if (pendingFinalize !== null) {
        const refs = pendingFinalize
        pendingFinalize = null
        useChatStore.getState().finalizeAssistantMessage(refs)
      }
      return
    }
    const char = charBuffer[0]
    charBuffer = charBuffer.slice(1)
    const { streamingId } = useChatStore.getState()
    if (!streamingId) {
      charBuffer = ''
      return
    }
    useChatStore.setState((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingId ? { ...m, content: m.content + char } : m
      ),
    }))
  }, CHAR_INTERVAL_MS)
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  input: '',
  streamingId: null,
  setInput: (value) => set({ input: value }),
  addUserMessage: (content) => {
    const message: ChatMessage = {
      id: uuid(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    set((state) => ({ messages: [...state.messages, message] }))
    return message
  },
  startAssistantMessage: () => {
    const id = uuid()
    const message: ChatMessage = {
      id,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    }
    charBuffer = ''
    pendingFinalize = null
    set((state) => ({ messages: [...state.messages, message], streamingId: id }))
    return id
  },
  appendChunk: (chunk) => {
    const { streamingId } = get()
    if (!streamingId) return
    charBuffer += chunk
    startDrain()
  },
  finalizeAssistantMessage: (references) => {
    const { streamingId } = get()
    if (!streamingId) return
    // If buffer is still draining, defer finalization until it's empty
    if (charBuffer.length > 0 || drainTimer) {
      pendingFinalize = references
      return
    }
    set((state) => ({
      streamingId: null,
      messages: state.messages.map((m) =>
        m.id === streamingId ? { ...m, references } : m
      ),
    }))
  },
  clear: () => {
    charBuffer = ''
    pendingFinalize = null
    if (drainTimer) { clearInterval(drainTimer); drainTimer = null }
    set({ messages: [], input: '', streamingId: null })
  },
}))
