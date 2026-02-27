/// <reference types="vite/client" />

type JournalxBridge = {
  ipc: {
    on: (channel: string, listener: (...args: unknown[]) => void) => void
    off: (channel: string, listener: (...args: unknown[]) => void) => void
    send: (channel: string, ...args: unknown[]) => void
    invoke: (channel: string, payload?: unknown) => Promise<unknown>
  }
}

declare global {
  interface Window {
    journalx?: JournalxBridge
  }
}

export {}