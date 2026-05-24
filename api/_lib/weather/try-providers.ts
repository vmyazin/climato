export interface ProviderEntry<T> {
  name: string
  fn: (signal: AbortSignal) => Promise<T>
}

export interface ProviderResult<T> {
  data: T
  source: string
}

// Tries each provider in order. Each call gets its own AbortController with
// the given timeout. On error or timeout, logs to console.error and moves to
// the next provider. Timers are cleared in finally so no leaked setTimeout
// survives the loop. Throws if all fail.
export async function tryProviders<T>(
  providers: ProviderEntry<T>[],
  timeoutMs: number,
): Promise<ProviderResult<T>> {
  const errors: string[] = []
  for (const { name, fn } of providers) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs)
    try {
      const data = await fn(controller.signal)
      return { data, source: name }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      console.error(`[weather] provider "${name}" failed: ${reason}`)
      errors.push(`${name}: ${reason}`)
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error(`all providers failed: ${errors.join(' | ')}`)
}
