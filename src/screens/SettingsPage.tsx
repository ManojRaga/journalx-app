import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useIpcInvoke } from '../shared/hooks/useIpcInvoke'
import type { ConfigureAIRequest, StoredSettings } from '../shared/types/renderer'

export function SettingsPage() {
  const [settings, setSettings] = useState<StoredSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-5-20250929')
  const [isSaving, setIsSaving] = useState(false)

  const { invoke: snapshot } = useIpcInvoke('settings:snapshot')
  const { invoke: configure } = useIpcInvoke('ai:configure')
  const { invoke: clear } = useIpcInvoke('ai:clear')

  useEffect(() => {
    let mounted = true
    snapshot(undefined).then((latest) => {
      if (!mounted || !latest) return
      setSettings(latest)
      setModel(latest.model)
    })

    return () => {
      mounted = false
    }
  }, [snapshot])

  const refreshSettings = async () => {
    const latest = await snapshot(undefined)
    if (latest) {
      setSettings(latest)
      setModel(latest.model)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const payload: ConfigureAIRequest = { apiKey, model }
      await configure(payload)
      setApiKey('')
      await refreshSettings()
      toast.success('Claude ready to converse.')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save API key.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    try {
      setIsSaving(true)
      await clear(undefined)
      await refreshSettings()
      toast.success('Claude configuration cleared.')
    } catch (error) {
      console.error(error)
      toast.error('Unable to clear configuration.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="flex h-full flex-col overflow-y-auto px-12 py-10">
      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-aurum/70">Sanctuary Settings</p>
        <h2 className="mt-2 text-3xl font-display text-pearl">Curate Your Experience</h2>
        <p className="mt-3 max-w-2xl text-xs text-pearl/60">
          Manage your Claude API key, appearance, and data preferences. Everything stays on your device.
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-display text-aurum">Claude API Key</h3>
          <p className="mt-2 text-sm text-pearl/60">
            Your key is encrypted and stored locally. Enter a new key to update Claude access.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <input
                type="password"
                placeholder={settings?.hasApiKey ? '••••••••••' : 'sk-ant-...'}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-pearl/80 placeholder:text-pearl/30"
              />
              <button
                onClick={handleSave}
                disabled={!apiKey || isSaving}
                className="rounded-xl bg-aurum px-5 py-3 text-xs uppercase tracking-[0.2em] text-midnight disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save
              </button>
            </div>
            {settings?.hasApiKey ? (
              <button
                onClick={handleClear}
                disabled={isSaving}
                className="self-start rounded-xl border border-aurum/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-aurum hover:bg-aurum/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Remove Stored Key
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-display text-aurum">Model Selection</h3>
          <p className="mt-2 text-sm text-pearl/60">Choose the Claude variant you prefer for conversations.</p>
          <div className="mt-4 flex items-center gap-4">
            <select
              value={model}
              onChange={(event) => setModel(event.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-pearl/80"
            >
              <option value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (2025-09-29)</option>
              <option value="claude-3-5-sonnet-20240620">Claude Sonnet 3.5</option>
              <option value="claude-3-haiku-20240307">Claude Haiku 3</option>
            </select>
            <span className="text-xs uppercase tracking-[0.3em] text-pearl/40">
              Active: {settings?.model ?? '—'}
            </span>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-display text-aurum">Themes</h3>
          <p className="mt-2 text-sm text-pearl/60">Light and bespoke themes will arrive soon.</p>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-display text-aurum">Data</h3>
          <p className="mt-2 text-sm text-pearl/60">Export, import, and backup tools will live here. For now, your data remains local and private.</p>
        </section>
      </div>
    </section>
  )
}
