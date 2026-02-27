import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type { ChatMessage } from '../types/renderer'

interface ChatState {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  addUserMessage: (content: string) => ChatMessage
  addAssistantMessage: (content: string, references: ChatMessage['references']) => ChatMessage
  clear: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  input: '',
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
  addAssistantMessage: (content, references) => {
    const message: ChatMessage = {
      id: uuid(),
      role: 'assistant',
      content,
      createdAt: new Date().toISOString(),
      references,
    }
    set((state) => ({ messages: [...state.messages, message] }))
    return message
  },
  clear: () => set({ messages: [], input: '' }),
}))
