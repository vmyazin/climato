// Maps the X-Climato-Source slug returned by /api/normals and /api/current
// to a human-readable label for footer attribution.

const SOURCE_LABELS: Record<string, string> = {
  'open-meteo': 'Open-Meteo',
  'nasa-power': 'NASA POWER',
  'met-no': 'MET Norway',
}

export function sourceLabel(slug: string): string {
  return SOURCE_LABELS[slug] ?? slug
}

// Builds the comma-joined label list shown in the footer. Deduplicates and
// preserves a stable display order. Returns "Open-Meteo" as the default when
// no source has been observed yet (the primary provider matches reality in
// the steady state).
export function dataSourceLabel(slugs: Array<string | undefined>): string {
  const seen = new Set<string>()
  for (const s of slugs) {
    if (s) seen.add(s)
  }
  if (seen.size === 0) return 'Open-Meteo'
  return [...seen].map(sourceLabel).join(', ')
}
