export interface CurrentTemp {
  tempC: number
  observedAt: string
}

interface ForecastResponse {
  current?: { time?: string; temperature_2m?: number }
}

export async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<CurrentTemp> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'temperature_2m',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) throw new Error(`open-meteo forecast HTTP ${res.status}`)
  const json = (await res.json()) as ForecastResponse
  const t = json.current?.temperature_2m
  const time = json.current?.time
  if (typeof t !== 'number' || !time) throw new Error('open-meteo forecast: missing current fields')
  return { tempC: t, observedAt: time }
}
