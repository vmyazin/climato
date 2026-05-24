import { ARCHIVE_START, ARCHIVE_END, type ArchiveDaily } from '../../normals.js'

export async function fetchOpenMeteoArchive(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<ArchiveDaily> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: ARCHIVE_START,
    end_date: ARCHIVE_END,
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration',
    timezone: 'auto',
  })
  const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, { signal })
  if (!res.ok) throw new Error(`open-meteo archive HTTP ${res.status}`)
  const json = (await res.json()) as { daily?: Partial<ArchiveDaily> }
  const d = json.daily
  if (
    !d ||
    !Array.isArray(d.time) ||
    !Array.isArray(d.temperature_2m_max) ||
    !Array.isArray(d.temperature_2m_min)
  ) {
    throw new Error('open-meteo archive: missing daily fields')
  }
  return d as ArchiveDaily
}
