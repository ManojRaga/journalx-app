import fs from 'fs-extra'
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'
import path from 'node:path'

import { SECRET_KEY_FILE } from './constants'

const KEY_LENGTH = 32
const IV_LENGTH = 12
const TAG_LENGTH = 16
const ALGORITHM = 'aes-256-gcm'

export class SecureStore {
  private key: Buffer | null = null

  private async resolveKey(): Promise<Buffer> {
    if (this.key) {
      return this.key
    }

    await fs.ensureDir(path.dirname(SECRET_KEY_FILE))

    if (await fs.pathExists(SECRET_KEY_FILE)) {
      const raw = await fs.readFile(SECRET_KEY_FILE, 'utf-8')
      this.key = Buffer.from(raw, 'base64')
      return this.key
    }

    const generated = randomBytes(KEY_LENGTH)
    await fs.writeFile(SECRET_KEY_FILE, generated.toString('base64'), { mode: 0o600 })
    this.key = generated
    return this.key
  }

  async encrypt(plain: string): Promise<string> {
    const key = await this.resolveKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  async decrypt(payload: string): Promise<string> {
    const key = await this.resolveKey()
    const buffer = Buffer.from(payload, 'base64')

    const iv = buffer.subarray(0, IV_LENGTH)
    const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const data = buffer.subarray(IV_LENGTH + TAG_LENGTH)

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
    return decrypted.toString('utf8')
  }
}

