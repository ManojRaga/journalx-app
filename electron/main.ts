import 'dotenv/config'
import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { FileStorage } from '../src/shared/storage/FileStorage'
import { JournalService } from '../src/shared/services/JournalService'
import { AIService } from '../src/shared/services/AIService'
import { SettingsStorage } from '../src/shared/storage/SettingsStorage'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
const storage = new FileStorage()
const settings = new SettingsStorage()
const journalService = new JournalService(storage)
const aiService = new AIService({ storage, settings })

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  registerIpcHandlers()

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)

function registerIpcHandlers() {
  ipcMain.handle('storage:listEntries', async () => journalService.listEntries())
  ipcMain.handle('storage:getEntry', async (_event, payload: { id: string }) => journalService.getEntry(payload.id))
  ipcMain.handle('storage:saveEntry', async (_event, payload) => journalService.saveEntry(payload))
  ipcMain.handle('storage:deleteEntry', async (_event, payload: { id: string }) => journalService.deleteEntry(payload.id))

  ipcMain.handle('ai:chat', async (_event, payload) => {
    await aiService.chat(payload, {
      onChunk: (text) => win?.webContents.send('ai:chat:chunk', text),
      onDone: (references) => win?.webContents.send('ai:chat:done', references),
      onError: (error) => win?.webContents.send('ai:chat:error', error),
    })
  })
  ipcMain.handle('ai:configure', async (_event, config) => aiService.configure(config))
  ipcMain.handle('ai:clear', async () => aiService.clearConfiguration())
  ipcMain.handle('settings:snapshot', async () => settings.snapshot())
  ipcMain.handle('settings:setModel', async (_event, payload: { model: string }) => {
    await settings.setSettings({ model: payload.model })
    aiService.setModel(payload.model)
  })
}
