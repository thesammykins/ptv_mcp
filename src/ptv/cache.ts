type Key = string | number;

export class TTLCache<V> {
  private store = new Map<Key, { value: V; expires: number }>();
  constructor(private ttlMs: number) {}

  get(k: Key): V | undefined {
    const entry = this.store.get(k);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) {
      this.store.delete(k);
      return undefined;
    }
    return entry.value;
  }

  set(k: Key, v: V): void {
    this.store.set(k, { value: v, expires: Date.now() + this.ttlMs });
  }

  delete(k: Key): void {
    this.store.delete(k);
  }

  clear(): void {
    this.store.clear();
  }
}
