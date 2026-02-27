import { useEffect } from 'react'
import type { IpcChannels } from '../types/events'

export function useIpcEvent(channel: IpcChannels, listener: (...args: unknown[]) => void) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('journalx' in window) || !window.journalx) {
      return
    }

    const bridge = window.journalx.ipc
    bridge.on(channel, listener)
    return () => {
      bridge.off(channel, listener)
    }
  }, [channel, listener])
}

