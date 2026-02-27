import { useCallback, useState } from 'react'
import type { IpcChannels, IpcInvokePayloads, IpcInvokeResponses } from '../types/events'

type PayloadType<Channel extends IpcChannels> = IpcInvokePayloads[Channel]

type ResponseType<Channel extends IpcChannels> = IpcInvokeResponses[Channel]

export function useIpcInvoke<Channel extends IpcChannels>(channel: Channel) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const invoke = useCallback(
    async (
      ...[payload]: PayloadType<Channel> extends void ? [payload?: PayloadType<Channel>] : [payload: PayloadType<Channel>]
    ): Promise<ResponseType<Channel> | null> => {
      setLoading(true)
      setError(null)
      try {
        if (typeof window === 'undefined' || !('journalx' in window) || !window.journalx) {
          throw new Error('IPC bridge unavailable')
        }
        const result = await window.journalx.ipc.invoke(channel, payload as PayloadType<Channel>)
        return result as ResponseType<Channel>
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Unknown error')
        setError(errorObj)
        return null
      } finally {
        setLoading(false)
      }
    },
    [channel],
  )

  return { invoke, loading, error }
}
