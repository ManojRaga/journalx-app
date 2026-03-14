import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useIpcInvoke } from '../shared/hooks/useIpcInvoke'
import type { ConfigureAIRequest, StoredSettings } from '../shared/types/renderer'

const AVAILABLE_MODELS = [
  { id: 'gpt-5-nano', label: 'GPT-5 Nano', description: 'Fastest, lightweight tasks' },
  { id: 'gpt-5-mini', label: 'GPT-5 Mini', description: 'Balanced speed and quality' },
  { id: 'gpt-5.4', label: 'GPT-5.4', description: 'Most capable, deeper analysis' },
]

export function SettingsPage() {
  const [settings, setSettings] = useState<StoredSettings | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { invoke: snapshot } = useIpcInvoke('settings:snapshot')
  const { invoke: configure } = useIpcInvoke('ai:configure')
  const { invoke: clear } = useIpcInvoke('ai:clear')
  const { invoke: setModel } = useIpcInvoke('settings:setModel')

  useEffect(() => {
    let mounted = true
    snapshot(undefined).then((latest) => {
      if (!mounted || !latest) return
      setSettings(latest)
    })

    return () => {
      mounted = false
    }
  }, [snapshot])

  const refreshSettings = async () => {
    const latest = await snapshot(undefined)
    if (latest) {
      setSettings(latest)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      const payload: ConfigureAIRequest = { apiKey }
      await configure(payload)
      setApiKey('')
      await refreshSettings()
      toast.success('OpenAI configured successfully.')
    } catch (error) {
      console.error(error)
      toast.error('Failed to save API key.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleModelChange = async (modelId: string) => {
    try {
      await setModel({ model: modelId })
      await refreshSettings()
      const label = AVAILABLE_MODELS.find((m) => m.id === modelId)?.label ?? modelId
      toast.success(`Switched to ${label}.`)
    } catch {
      toast.error('Failed to switch model.')
    }
  }

  const handleClear = async () => {
    try {
      setIsSaving(true)
      await clear(undefined)
      await refreshSettings()
      toast.success('OpenAI configuration cleared.')
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
          Manage your OpenAI API key, appearance, and data preferences. Everything stays on your device.
        </p>
      </header>

      <div className="space-y-6">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl">
          <h3 className="text-lg font-display text-aurum">OpenAI API Key</h3>
          <p className="mt-2 text-sm text-pearl/60">
            Your key is encrypted and stored locally. Enter a new key to update OpenAI access.
          </p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <input
                type="password"
                placeholder={settings?.hasApiKey ? '••••••••••' : 'sk-...'}
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
          <h3 className="text-lg font-display text-aurum">Model</h3>
          <p className="mt-2 text-sm text-pearl/60">
            Choose the OpenAI model used for journal analysis in Chat.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {AVAILABLE_MODELS.map((m) => {
              const isActive = (settings?.model ?? 'gpt-5-nano') === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => !isActive && handleModelChange(m.id)}
                  className={`flex items-center justify-between rounded-xl border px-5 py-4 text-left transition ${
                    isActive
                      ? 'border-aurum/50 bg-aurum/10'
                      : 'border-white/10 bg-white/5 hover:border-aurum/30 hover:bg-white/10'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${isActive ? 'text-aurum' : 'text-pearl/80'}`}>{m.label}</p>
                    <p className="mt-0.5 text-xs text-pearl/50">{m.description}</p>
                  </div>
                  {isActive ? (
                    <span className="text-xs uppercase tracking-[0.2em] text-aurum/70">Active</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

      </div>
    </section>
  )
}
