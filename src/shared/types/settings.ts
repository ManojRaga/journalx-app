export type Settings = {
  encryptedApiKey?: string
  model?: string
}

export type SettingsSnapshot = {
  hasApiKey: boolean
  model: string
}
