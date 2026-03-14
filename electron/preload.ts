import { contextBridge, ipcRenderer } from 'electron'

type IpcInvoke = typeof ipcRenderer.invoke

const api = {
  on: (...args: Parameters<typeof ipcRenderer.on>) => ipcRenderer.on(...args),
  off: (...args: Parameters<typeof ipcRenderer.off>) => ipcRenderer.off(...args),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel),
  send: (...args: Parameters<typeof ipcRenderer.send>) => ipcRenderer.send(...args),
  invoke: (...args: Parameters<IpcInvoke>) => ipcRenderer.invoke(...args),
}

contextBridge.exposeInMainWorld('journalx', {
  ipc: api,
})
