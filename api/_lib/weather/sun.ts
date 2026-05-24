// @ts-ignore — tz-lookup ships no types
import tzlookup from 'tz-lookup'

// NOAA Solar Calculator algorithm. Returns UT (UTC) Date for sunrise/sunset.
// References: https://gml.noaa.gov/grad/solcalc/
// Returns null when the sun does not rise / set on that date at that latitude.
function solarEvent(date: Date, lat: number, lon: number, rising: boolean): Date | null {
  const rad = Math.PI / 180
  const deg = 180 / Math.PI

  // Days since J2000.0
  const J2000 = Date.UTC(2000, 0, 1, 12) // 2000-01-01T12:00Z
  const n = (date.getTime() - J2000) / 86400000

  // Mean solar noon (in fractional days, west longitude positive in NOAA but we
  // use the standard convention: east positive, so subtract lon/360)
  const Jstar = n - lon / 360

  // Solar mean anomaly
  const M = (357.5291 + 0.98560028 * Jstar) % 360
  const Mr = M * rad

  // Equation of the center
  const C =
    1.9148 * Math.sin(Mr) +
    0.02 * Math.sin(2 * Mr) +
    0.0003 * Math.sin(3 * Mr)

  // Ecliptic longitude
  const lambda = (M + C + 180 + 102.9372) % 360
  const lambdaR = lambda * rad

  // Solar transit (Julian date of solar noon)
  const Jtransit = Jstar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambdaR)

  // Declination of the sun
  const sinDelta = Math.sin(lambdaR) * Math.sin(23.4397 * rad)
  const delta = Math.asin(sinDelta)

  // Hour angle for sunrise/sunset (geometric, no atmospheric refraction correction
  // beyond the standard -0.833° altitude)
  const phi = lat * rad
  const cosH =
    (Math.sin(-0.833 * rad) - Math.sin(phi) * sinDelta) /
    (Math.cos(phi) * Math.cos(delta))
  if (cosH > 1 || cosH < -1) return null // polar day/night

  const H = Math.acos(cosH) * deg
  const Jevent = Jtransit + (rising ? -H : H) / 360

  // Convert J back to a Date
  return new Date(J2000 + Jevent * 86400000)
}

function formatLocal(date: Date, timeZone: string): string {
  // en-GB gives 24-hour HH:MM.
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export interface SunMonths {
  sunrise: string[] // 12 entries, HH:MM in city's local time
  sunset: string[]
}

// Computes the 15th-of-month sunrise/sunset for the city, rendered as HH:MM
// in the city's IANA timezone. Falls back to '06:00' / '18:00' on polar days.
export function monthlySunriseSunset(lat: number, lon: number): SunMonths {
  const tz = tzlookup(lat, lon)
  const year = new Date().getUTCFullYear()
  const sunrise: string[] = []
  const sunset: string[] = []
  for (let m = 0; m < 12; m++) {
    const day = new Date(Date.UTC(year, m, 15, 12))
    const sr = solarEvent(day, lat, lon, true)
    const ss = solarEvent(day, lat, lon, false)
    sunrise.push(sr ? formatLocal(sr, tz) : '06:00')
    sunset.push(ss ? formatLocal(ss, tz) : '18:00')
  }
  return { sunrise, sunset }
}
