import type { CurrentTemp } from './providers/open-meteo-forecast.js'
import { fetchOpenMeteoForecast } from './providers/open-meteo-forecast.js'
import { fetchMetNoForecast } from './providers/met-no-forecast.js'
import { tryProviders } from './try-providers.js'

const TIMEOUT_MS = 4000

export async function fetchCurrentTemp(
  lat: number,
  lon: number,
): Promise<{ data: CurrentTemp; source: string }> {
  return tryProviders(
    [
      { name: 'open-meteo', fn: (signal) => fetchOpenMeteoForecast(lat, lon, signal) },
      { name: 'met-no',     fn: (signal) => fetchMetNoForecast(lat, lon, signal) },
    ],
    TIMEOUT_MS,
  )
}
