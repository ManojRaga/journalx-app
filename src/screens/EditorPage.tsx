import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import { useIpcInvoke } from '../shared/hooks/useIpcInvoke'
import { useAppData } from '../shared/hooks/useAppData'

export function EditorPage() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  const { refreshJournals } = useAppData()
  const { invoke: getEntry } = useIpcInvoke('storage:getEntry')
  const { invoke: saveEntry } = useIpcInvoke('storage:saveEntry')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

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
      await refreshJournals()
      navigate('/')
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
            onClick={() => setShowPreview(!showPreview)}
            className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.3em] transition ${
              showPreview
                ? 'border-aurum/50 bg-aurum/10 text-aurum'
                : 'border-white/10 text-pearl/50 hover:bg-white/5'
            }`}
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
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
            <div className="flex gap-6" style={{ height: '60vh' }}>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Start writing your reflection... (supports Markdown)"
                className={`${showPreview ? 'w-1/2' : 'w-full'} resize-none rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base leading-relaxed text-pearl/80 placeholder:text-pearl/30 focus:outline-none`}
              />
              {showPreview && (
                <div className="w-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.3em] text-pearl/30">Preview</p>
                  <div className="prose prose-invert max-w-none leading-relaxed prose-p:my-2 prose-li:my-0.5 prose-ul:my-2 prose-ol:my-2 prose-headings:text-pearl prose-headings:font-display prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-strong:text-pearl prose-a:text-aurum/80 text-pearl/80">
                    <Markdown>{content || '*Start writing to see a preview...*'}</Markdown>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
