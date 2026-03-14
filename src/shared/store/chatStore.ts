import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { ChatMessage } from '../types/renderer'

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
    set((state) => ({ messages: [...state.messages, message], streamingId: id }))
    return id
  },
  appendChunk: (chunk) => {
    const { streamingId } = get()
    if (!streamingId) return
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingId ? { ...m, content: m.content + chunk } : m
      ),
    }))
  },
  finalizeAssistantMessage: (references) => {
    const { streamingId } = get()
    if (!streamingId) return
    set((state) => ({
      streamingId: null,
      messages: state.messages.map((m) =>
        m.id === streamingId ? { ...m, references } : m
      ),
    }))
  },
  clear: () => set({ messages: [], input: '', streamingId: null }),
}))
