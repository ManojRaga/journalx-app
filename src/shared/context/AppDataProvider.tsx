import { useCallback, useEffect, useMemo, useState } from 'react'
import { AppDataContext } from './AppDataContext'
import { useIpcInvoke } from '../hooks/useIpcInvoke'
import type { JournalPreview, StoredSettings } from '../types/renderer'
import type { AppDataContextValue } from '../types/context'

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [journals, setJournals] = useState<JournalPreview[]>([])
  const [settings, setSettings] = useState<StoredSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const { invoke: listEntries } = useIpcInvoke('storage:listEntries')
  const { invoke: loadSettings } = useIpcInvoke('settings:snapshot')

  const refreshJournals = useCallback(async () => {
    const entries = await listEntries(undefined)
    if (entries) setJournals(entries)
  }, [listEntries])

  const refreshSettings = useCallback(async () => {
    const snapshot = await loadSettings(undefined)
    if (snapshot) setSettings(snapshot)
  }, [loadSettings])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([refreshJournals(), refreshSettings()])
    } finally {
      setLoading(false)
    }
  }, [refreshJournals, refreshSettings])

  useEffect(() => {
    refreshAll().catch((error) => console.error('Failed to load initial data', error))

    const focusHandler = () => {
      refreshJournals().catch((error) => console.error('Failed to refresh journals', error))
    }

    window.addEventListener('focus', focusHandler)

    return () => {
      window.removeEventListener('focus', focusHandler)
    }
  }, [refreshAll, refreshJournals])

  const value = useMemo<AppDataContextValue>(
    () => ({ journals, refreshJournals, settings, refreshSettings, loading }),
    [journals, loading, refreshJournals, refreshSettings, settings],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

