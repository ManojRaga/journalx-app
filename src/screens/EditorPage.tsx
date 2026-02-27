import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useIpcInvoke } from '../shared/hooks/useIpcInvoke'

export function EditorPage() {
  const { entryId } = useParams()
  const { invoke: getEntry } = useIpcInvoke('storage:getEntry')
  const { invoke: saveEntry } = useIpcInvoke('storage:saveEntry')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    if (!entryId) {
      setTitle('')
      setContent('')
      return
    }

    getEntry({ id: entryId }).then((entry) => {
      if (!mounted || !entry) return
      setTitle(entry.title)
      setContent(entry.content)
    })

    return () => {
      mounted = false
    }
  }, [entryId, getEntry])

  const handleSave = async () => {
    setSaving(true)
    const result = await saveEntry({ id: entryId, title: title || 'Untitled', content, tags: [] })
    if (result) {
      setStatus('Saved')
    } else {
      setStatus('Failed to save')
    }
    setSaving(false)
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-12 py-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-aurum/70">Writing Studio</p>
          <h2 className="mt-2 text-3xl font-display text-pearl">
            {entryId ? 'Refine Your Reflection' : 'Compose a New Memory'}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-pearl/40">{status}</span>
          <button
            className="rounded-full bg-aurum px-6 py-2 text-xs uppercase tracking-[0.2em] text-midnight shadow-glow disabled:opacity-40"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-12">
          <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-black/20 p-8 backdrop-blur-xl">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Entry title"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg font-display text-pearl/90 placeholder:text-pearl/30 focus:outline-none"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Start writing your reflection..."
              className="h-[60vh] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm leading-relaxed text-pearl/80 placeholder:text-pearl/30 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
