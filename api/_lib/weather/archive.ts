import { aggregate, type Normals } from '../normals.js'
import { fetchOpenMeteoArchive } from './providers/open-meteo-archive.js'
import { fetchNasaPowerArchive } from './providers/nasa-power-archive.js'
import { tryProviders } from './try-providers.js'

const TIMEOUT_MS = 4000

export async function fetchArchiveNormals(
  lat: number,
  lon: number,
): Promise<{ data: Normals; source: string }> {
  const { data, source } = await tryProviders(
    [
      { name: 'open-meteo', fn: (signal) => fetchOpenMeteoArchive(lat, lon, signal) },
      { name: 'nasa-power', fn: (signal) => fetchNasaPowerArchive(lat, lon, signal) },
    ],
    TIMEOUT_MS,
  )
  return { data: aggregate(data, lat, lon), source }
}
