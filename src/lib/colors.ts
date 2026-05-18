// Shared color tokens for the comparison page components.
//
// The single-city VariationA/B/C components define their palette inline at
// the top of each file (cream backgrounds, brand red accent, etc.). These
// tokens are the additions needed for two-city comparison rendering:
// two distinct hues that read as "two editorial categories" without
// reusing the Climato brand red (which carries alarm semantics when
// applied to one of N peer items).

// Cool, water/sky — City A identity
export const CITY_A_COLOR = '#1d5a52' // deep teal

// Warm, sun/earth — City B identity
export const CITY_B_COLOR = '#b08229' // warm ochre

// Mix of teal + ochre — the "both ideal" overlap row in the calendar and
// the overlap accent in the versus diptych
export const OVERLAP_COLOR = '#5a6240' // muted olive

// Suitability gradient — used inside <BestMonthsCalendar>. The values
// are RGBA strings (not hex) because suitability cells overlay a white
// background and the alpha lets the grid borders show through.
export const SUITABILITY = {
  s0: 'transparent',                  // bad
  s1: 'rgba(207, 154, 58, 0.12)',     // poor / cool-wet
  s2: 'rgba(207, 154, 58, 0.32)',     // workable
  s3: 'rgba(74, 124, 58, 0.38)',      // ideal
} as const
