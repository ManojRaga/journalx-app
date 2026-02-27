export class InMemoryStore {
  private readonly store = new Map<string, unknown>()

  get<T>(key: string): T | null {
    return (this.store.get(key) as T | undefined) ?? null
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value)
  }

  has(key: string): boolean {
    return this.store.has(key)
  }

  delete(key: string): void {
    this.store.delete(key)
  }
}

