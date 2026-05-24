import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { tryProviders } from '../try-providers.js'

describe('tryProviders', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Negative-path tests intentionally fire provider failures. Silence the
    // expected console.error spam so test output stays readable.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the first provider result on success', async () => {
    const out = await tryProviders([
      { name: 'p1', fn: async () => 'a' },
      { name: 'p2', fn: async () => 'b' },
    ], 4000)
    expect(out).toEqual({ data: 'a', source: 'p1' })
  })

  it('falls through to the next provider when the first throws', async () => {
    const out = await tryProviders([
      { name: 'p1', fn: async () => { throw new Error('boom') } },
      { name: 'p2', fn: async () => 'b' },
    ], 4000)
    expect(out).toEqual({ data: 'b', source: 'p2' })
  })

  it('throws when all providers fail', async () => {
    await expect(tryProviders([
      { name: 'p1', fn: async () => { throw new Error('one') } },
      { name: 'p2', fn: async () => { throw new Error('two') } },
    ], 4000)).rejects.toThrow(/all providers failed/i)
  })

  it('aborts a provider that exceeds the timeout', async () => {
    const slow = { name: 'slow', fn: (_signal: AbortSignal) =>
      new Promise<string>((_, reject) => {
        _signal.addEventListener('abort', () => reject(new Error('aborted')))
      })
    }
    const fast = { name: 'fast', fn: async () => 'fast-result' }

    const promise = tryProviders([slow, fast], 4000)
    await vi.advanceTimersByTimeAsync(4001)
    await expect(promise).resolves.toEqual({ data: 'fast-result', source: 'fast' })
  })
})
