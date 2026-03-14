import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppData } from '../shared/hooks/useAppData'
import { useIpcInvoke } from '../shared/hooks/useIpcInvoke'
import type { JournalPreview } from '../shared/types/renderer'
import type { JournalEntry } from '../shared/types/journal'

export function HomePage() {
  const { journals, refreshJournals } = useAppData()
  const { invoke: getEntry } = useIpcInvoke('storage:getEntry')
  const { invoke: deleteEntry } = useIpcInvoke('storage:deleteEntry')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)

  const handleDelete = async (id: string) => {
    await deleteEntry({ id })
    setSelectedId(null)
    setSelectedEntry(null)
    refreshJournals()
  }

  const sortedJournals = useMemo(() => {
    return [...journals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }, [journals])

  useEffect(() => {
    if (!selectedId && sortedJournals.length > 0) {
      setSelectedId(sortedJournals[0].id)
    }
  }, [selectedId, sortedJournals])

  useEffect(() => {
    if (!selectedId) {
      setSelectedEntry(null)
      return
    }

    let mounted = true
    getEntry({ id: selectedId }).then((entry) => {
      if (!mounted) return
      setSelectedEntry(entry)
    })

    return () => {
      mounted = false
    }
  }, [selectedId, getEntry])

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="border-b border-white/10 px-12 py-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-aurum/70">Today’s Intention</p>
            <h2 className="mt-3 text-4xl font-display text-pearl drop-shadow">Welcome back, Luminary</h2>
            <p className="mt-4 max-w-2xl text-sm text-pearl/70">
              Capture your thoughts, reflect on your journey, and let JournalX weave your story into moments of insight.
            </p>
          </div>
          <button
            onClick={() => refreshJournals()}
            className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.3em] text-pearl/50 transition hover:bg-white/5 hover:text-pearl"
          >
            Refresh Library
          </button>
        </div>
        <div className="mt-8">
          <Link
            to="/editor"
            className="inline-flex items-center gap-3 rounded-full bg-aurum px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-midnight shadow-glow transition-transform duration-300 hover:scale-105"
          >
            ✍️ New Entry
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden px-12 py-10">
        <JournalLibrary entries={sortedJournals} selectedId={selectedId} onSelect={setSelectedId} />
        <JournalPreviewPanel entry={selectedEntry} onDelete={handleDelete} />
      </div>
    </section>
  )
}

function JournalLibrary({
  entries,
  selectedId,
  onSelect,
}: {
  entries: JournalPreview[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center text-center text-pearl/50">
        <div className="rounded-full border border-white/10 bg-white/5 px-6 py-4 text-xs uppercase tracking-[0.3em]">
          Your archive awaits its first story
        </div>
        <p className="mt-6 max-w-lg text-sm">
          Create a new entry to begin building your personal knowledge base. Each reflection enriches the AI’s context.
        </p>
      </div>
    )
  }

  return (
    <aside className="w-[24rem] flex-shrink-0 space-y-3 overflow-y-auto pr-6">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onSelect(entry.id)}
          className={`group w-full rounded-3xl border px-5 py-4 text-left backdrop-blur-xl transition ${
            entry.id === selectedId
              ? 'border-aurum/50 bg-aurum/10 text-aurum'
              : 'border-white/5 bg-black/30 text-pearl hover:border-aurum/30'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <h3 className="font-display text-lg text-current group-hover:text-aurum">{entry.title}</h3>
            <div className="text-right text-[10px] uppercase tracking-[0.35em] text-current/60">
              <div className="text-current/40">Updated</div>
              <div>{new Date(entry.updatedAt).toLocaleDateString()}</div>
            </div>
          </div>
          {entry.summary ? (
            <p className="mt-3 line-clamp-2 text-sm text-current/70">{entry.summary}</p>
          ) : null}
          {entry.tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em]">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className={`rounded-full border px-3 py-1 ${
                    entry.id === selectedId ? 'border-aurum/70 text-aurum' : 'border-aurum/40 text-aurum'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </button>
      ))}
    </aside>
  )
}

function JournalPreviewPanel({ entry, onDelete }: { entry: JournalEntry | null; onDelete: (id: string) => void }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-pearl/40">
        <p>Select an entry to view its contents.</p>
      </div>
    )
  }

  return (
    <article className="flex-1 overflow-y-auto rounded-3xl border border-white/10 bg-black/20 p-10 backdrop-blur-xl">
      <header>
        <h1 className="text-3xl font-display text-pearl">{entry.title}</h1>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-pearl/40">
          Created {new Date(entry.createdAt).toLocaleString()} · Updated {new Date(entry.updatedAt).toLocaleString()}
        </p>
        <div className="mt-6 flex gap-3 text-xs uppercase tracking-[0.25em] text-pearl/50">
          <Link
            to={`/editor/${entry.id}`}
            className="rounded-full border border-aurum/40 px-4 py-2 text-aurum transition hover:bg-aurum/10"
          >
            Edit Entry
          </Link>
          {confirmingDelete ? (
            <>
              <button
                onClick={() => {
                  onDelete(entry.id)
                  setConfirmingDelete(false)
                }}
                className="rounded-full border border-red-500/60 px-4 py-2 text-red-400 transition hover:bg-red-500/10"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-pearl/50 transition hover:bg-white/5"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="rounded-full border border-white/10 px-4 py-2 text-pearl/50 transition hover:border-red-500/40 hover:text-red-400"
            >
              Delete Entry
            </button>
          )}
        </div>
      </header>
      <div className="mt-8 whitespace-pre-wrap text-sm leading-relaxed text-pearl/80">
        {entry.content || 'No content yet'}
      </div>
      {entry.tags.length > 0 ? (
        <footer className="mt-8 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.3em] text-aurum/70">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-aurum/40 px-3 py-1">
              {tag}
            </span>
          ))}
        </footer>
      ) : null}
    </article>
  )
}
