import { ARCHIVE_START, ARCHIVE_END, type ArchiveDaily } from '../../normals.js'

interface NasaPowerResponse {
  properties?: {
    parameter?: {
      T2M_MAX?: Record<string, number>
      T2M_MIN?: Record<string, number>
      PRECTOTCORR?: Record<string, number>
      ALLSKY_SFC_SW_DWN?: Record<string, number>
      CLRSKY_SFC_SW_DWN?: Record<string, number>
    }
  }
}

// Day length in seconds for a given latitude and day of year. Closed-form
// approximation using solar declination; accurate to within a few minutes.
function dayLengthSeconds(lat: number, dayOfYear: number): number {
  const phi = (lat * Math.PI) / 180
  // Solar declination (Cooper's formula)
  const delta = (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365)
  const cosH = -Math.tan(phi) * Math.tan(delta)
  if (cosH >= 1) return 0          // polar night
  if (cosH <= -1) return 24 * 3600 // polar day
  const H = Math.acos(cosH) // hour angle in radians
  return (2 * H * 12 * 3600) / Math.PI
}

function isoDate(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
}

function dayOfYear(yyyymmdd: string): number {
  const y = +yyyymmdd.slice(0, 4)
  const m = +yyyymmdd.slice(4, 6) - 1
  const d = +yyyymmdd.slice(6, 8)
  const start = Date.UTC(y, 0, 1)
  return Math.floor((Date.UTC(y, m, d) - start) / 86400000) + 1
}

// NASA POWER uses -999 as its sentinel for missing values. Treat as null.
function val(map: Record<string, number> | undefined, key: string): number | null {
  if (!map) return null
  const v = map[key]
  if (v === undefined || v === -999) return null
  return v
}

export function normalizeNasaPower(json: NasaPowerResponse, lat: number): ArchiveDaily {
  const p = json.properties?.parameter
  if (!p?.T2M_MAX || !p.T2M_MIN) {
    throw new Error('nasa-power: missing core temperature fields')
  }

  const keys = Object.keys(p.T2M_MAX).sort() // sortable: YYYYMMDD lexicographic = chronological
  // Reject empty-but-200 responses; an empty parameter map would otherwise
  // aggregate to all-zero Normals and get cached in KV for 30 days.
  if (keys.length === 0) {
    throw new Error('nasa-power: empty T2M_MAX')
  }

  const time: string[] = []
  const tmax: (number | null)[] = []
  const tmin: (number | null)[] = []
  const prcp: (number | null)[] = []
  const sun: (number | null)[] = []

  for (const k of keys) {
    time.push(isoDate(k))
    tmax.push(val(p.T2M_MAX, k))
    tmin.push(val(p.T2M_MIN, k))
    prcp.push(val(p.PRECTOTCORR, k))

    const all = val(p.ALLSKY_SFC_SW_DWN, k)
    const clr = val(p.CLRSKY_SFC_SW_DWN, k)
    if (all == null || clr == null || clr <= 0) {
      sun.push(null)
    } else {
      const ratio = Math.max(0, Math.min(1, all / clr))
      const dl = dayLengthSeconds(lat, dayOfYear(k))
      sun.push(Math.round(ratio * dl))
    }
  }

  return {
    time,
    temperature_2m_max: tmax,
    temperature_2m_min: tmin,
    precipitation_sum: prcp,
    sunshine_duration: sun,
  }
}

export async function fetchNasaPowerArchive(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<ArchiveDaily> {
  const start = ARCHIVE_START.replaceAll('-', '')
  const end = ARCHIVE_END.replaceAll('-', '')
  const params = new URLSearchParams({
    parameters: 'T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN',
    community: 'AG',
    latitude: String(lat),
    longitude: String(lon),
    start,
    end,
    format: 'JSON',
  })
  const url = `https://power.larc.nasa.gov/api/temporal/daily/point?${params}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`nasa-power HTTP ${res.status}`)
  const json = (await res.json()) as NasaPowerResponse
  return normalizeNasaPower(json, lat)
}
