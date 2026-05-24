import type { CurrentTemp } from './open-meteo-forecast.js'

// MET Norway requires identification. Includes a contact URL so they can
// reach us if our usage causes issues. Bump the version when the user-agent
// string changes meaningfully.
const USER_AGENT = 'climato/1.0 (+https://climato.app/contact)'

interface MetNoResponse {
  properties?: {
    timeseries?: Array<{
      time?: string
      data?: { instant?: { details?: { air_temperature?: number } } }
    }>
  }
}

export function normalizeMetNo(json: MetNoResponse): CurrentTemp {
  const ts = json.properties?.timeseries
  if (!ts || ts.length === 0) throw new Error('met-no: missing or empty timeseries')
  const first = ts[0]!
  const t = first.data?.instant?.details?.air_temperature
  const time = first.time
  if (typeof t !== 'number' || !time) throw new Error('met-no: missing air_temperature or time')
  return { tempC: t, observedAt: time }
}

export async function fetchMetNoForecast(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<CurrentTemp> {
  // MET Norway recommends ≤4 decimal places (privacy + cache).
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`met-no HTTP ${res.status}`)
  const json = (await res.json()) as MetNoResponse
  return normalizeMetNo(json)
}
