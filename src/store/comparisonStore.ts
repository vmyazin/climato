import { create } from 'zustand'
import type { GeoCity } from '../data/cities'

// Separate from weatherStore by design — kept tiny so single-city state
// (selectedCity, recentCities, unit, etc.) doesn't get mixed with
// comparison-page state. When the URL is /compare/{a}/vs/{b} both cities
// are populated here; otherwise both are null and the single-city flow runs.

interface ComparisonState {
  cityA: GeoCity | null
  cityB: GeoCity | null
  notFound: 'a' | 'b' | null   // set when geocoding fails for one of the halves

  setPair: (a: GeoCity, b: GeoCity) => void
  setHalf: (which: 'a' | 'b', city: GeoCity) => void
  setNotFound: (which: 'a' | 'b' | null) => void
  clear: () => void
}

export const useComparisonStore = create<ComparisonState>((set) => ({
  cityA: null,
  cityB: null,
  notFound: null,

  setPair: (cityA, cityB) => set({ cityA, cityB, notFound: null }),
  setHalf: (which, city) =>
    set(which === 'a' ? { cityA: city } : { cityB: city }),
  setNotFound: (notFound) => set({ notFound }),
  clear: () => set({ cityA: null, cityB: null, notFound: null }),
}))
