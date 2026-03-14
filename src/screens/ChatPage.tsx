import { FormEvent, ChangeEvent, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ChatMessage, ChatReference } from '../shared/types/renderer'
import { useChatStore } from '../shared/store/chatStore'

export function ChatPage() {
  const { messages, input, streamingId, setInput, addUserMessage, startAssistantMessage, clear } = useChatStore()
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ipc = (window as any).journalx?.ipc
    if (!ipc) return

    const onChunk = (_event: any, text: string) => {
      useChatStore.getState().appendChunk(text)
    }
    const onDone = (_event: any, references: ChatReference[]) => {
      useChatStore.getState().finalizeAssistantMessage(references)
      setLoading(false)
    }
    const onError = (_event: any, error: string) => {
      toast.error(error || 'Unable to reach OpenAI. Check your API key in Settings.')
      setLoading(false)
    }

    ipc.on('ai:chat:chunk', onChunk)
    ipc.on('ai:chat:done', onDone)
    ipc.on('ai:chat:error', onError)

    return () => {
      ipc.removeAllListeners('ai:chat:chunk')
      ipc.removeAllListeners('ai:chat:done')
      ipc.removeAllListeners('ai:chat:error')
    }
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = input.trim()
    if (!trimmed || loading) return

    const history = messages.map((m) => ({ role: m.role, content: m.content }))
    addUserMessage(trimmed)
    setInput('')
    startAssistantMessage()
    setLoading(true)

    const ipc = (window as any).journalx?.ipc
    if (!ipc) {
      toast.error('IPC bridge unavailable')
      setLoading(false)
      return
    }

    try {
      await ipc.invoke('ai:chat', { prompt: trimmed, history })
    } catch {
      toast.error('Unable to reach OpenAI. Check your API key in Settings.')
      setLoading(false)
    }
  }

  const hasMessages = messages.length > 0

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-white/10 px-12 py-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-aurum/70">Journal Analysis</p>
            <h2 className="mt-2 text-3xl font-display text-pearl">Query Your Archive</h2>
            <p className="mt-3 max-w-2xl text-xs text-pearl/60">
              Ask factual questions about your journal entries. Get analytical insights and objective information.
            </p>
          </div>
          {hasMessages ? (
            <button
              onClick={clear}
              className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-pearl/50 hover:bg-white/5"
            >
              Clear Chat
            </button>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col px-12 py-10">
        <div
          ref={scrollRef}
          className="space-y-6 overflow-y-scroll rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl"
          style={{
            height: 'calc(100vh - 300px)',
            scrollbarWidth: 'thin',
            scrollbarColor: '#d4af37 transparent'
          }}
        >
          {hasMessages ? messages.map((message) => <MessageBubble key={message.id} message={message} isStreaming={message.id === streamingId} />) : <EmptyState />}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex items-center gap-4">
          <input
            value={input}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setInput(event.target.value)}
            placeholder="Ask a question about your journal..."
            className="flex-1 rounded-full border border-white/10 bg-white/5 px-6 py-4 text-sm text-pearl/80 placeholder:text-pearl/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-full bg-aurum px-6 py-3 text-xs uppercase tracking-[0.2em] text-midnight transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  )
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const align = message.role === 'user' ? 'justify-end' : 'justify-start'
  const bubbleClasses =
    message.role === 'user'
      ? 'bg-aurum/20 text-aurum shadow-glow'
      : 'border border-aurum/30 bg-black/50 text-pearl/80'

  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-2xl rounded-2xl px-6 py-4 text-sm leading-relaxed ${bubbleClasses}`}>
        <p className="whitespace-pre-wrap">{message.content}{isStreaming && message.content.length === 0 ? '...' : ''}</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center text-pearl/50">
      <div className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-xs uppercase tracking-[0.3em]">
Ready for Analysis
      </div>
      <p className="mt-6 max-w-lg text-sm">
        Ask factual questions about patterns, themes, or specific topics in your journal entries for analytical insights.
      </p>
    </div>
  )
}
