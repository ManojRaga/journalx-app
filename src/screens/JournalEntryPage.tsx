import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useIpcInvoke } from '../shared/hooks/useIpcInvoke'
import type { JournalEntry } from '../shared/types/journal'

export function JournalEntryPage() {
  const { entryId } = useParams()
  const navigate = useNavigate()
  const { invoke: getEntry } = useIpcInvoke('storage:getEntry')
  const [entry, setEntry] = useState<JournalEntry | null>(null)

  useEffect(() => {
    if (!entryId) {
      navigate('/')
      return
    }

    let mounted = true
    getEntry({ id: entryId }).then((result) => {
      if (!mounted) return
      if (!result) {
        navigate('/')
        return
      }
      setEntry(result)
    })

    return () => {
      mounted = false
    }
  }, [entryId, getEntry, navigate])

  if (!entry) {
    return null
  }

  return (
    <section className="flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-white/10 px-12 py-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-aurum/70">Journal Entry</p>
          <h1 className="mt-2 text-4xl font-display text-pearl">{entry.title}</h1>
          <p className="mt-2 text-xs uppercase tracking-[0.3em] text-pearl/40">
            Created {new Date(entry.createdAt).toLocaleString()} · Updated {new Date(entry.updatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/editor/${entry.id}`}
            className="rounded-full border border-aurum/40 px-5 py-2 text-xs uppercase tracking-[0.2em] text-aurum transition hover:bg-aurum/10"
          >
            Edit Entry
          </Link>
          <Link
            to="/"
            className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.2em] text-pearl/60 hover:bg-white/5"
          >
            Back Home
          </Link>
        </div>
      </header>

      <article className="flex-1 overflow-y-auto px-12 py-10">
        <div className="prose prose-invert max-w-3xl space-y-6">
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/20 px-6 py-4 text-sm leading-relaxed text-pearl/80">
            {entry.content || 'No content yet'}
          </pre>
          {entry.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-aurum/70">
              {entry.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-aurum/40 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </article>
    </section>
  )
}
