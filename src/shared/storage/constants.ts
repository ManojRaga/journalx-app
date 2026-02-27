import os from 'node:os'
import path from 'node:path'

export const APP_DIR = path.join(os.homedir(), '.journalx')
export const DATA_DIR = path.join(APP_DIR, 'entries')
export const CONFIG_FILE = path.join(APP_DIR, 'config.json')
export const SECRET_KEY_FILE = path.join(APP_DIR, 'secret.key')
export const VECTOR_DIR = path.join(APP_DIR, 'vectors')
export const INDEX_FILE = path.join(APP_DIR, 'index.json')

