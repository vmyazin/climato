import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GeoCity } from '../data/cities'

type Unit = 'C' | 'F'
type ChartVariant = 'bar' | 'line' | 'ring'
type ActiveView = 'a' | 'b' | 'c'

const defaultCity: GeoCity = {
  id: 'reykjavik',
  name: 'Reykjavík',
  country: 'Iceland',
  lat: 64.1466,
  lon: -21.9426,
  elev: 37,
}

const latLonKey = (c: GeoCity) => `${c.lat.toFixed(1)},${c.lon.toFixed(1)}`

interface WeatherState {
  selectedCity: GeoCity
  recentCities: GeoCity[]
  unit: Unit
  chartVariant: ChartVariant
  activeView: ActiveView
  selectedMonth: number

  setCity: (city: GeoCity) => void
  setUnit: (unit: Unit) => void
  setChartVariant: (v: ChartVariant) => void
  setActiveView: (v: ActiveView) => void
  setSelectedMonth: (m: number) => void
}

export { latLonKey }

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      selectedCity: defaultCity,
      recentCities: [],
      unit: 'C',
      chartVariant: 'bar',
      activeView: 'a',
      selectedMonth: new Date().getMonth(),

      setCity: (selectedCity) =>
        set(state => ({
          selectedCity,
          recentCities: [
            selectedCity,
            ...state.recentCities.filter(c => latLonKey(c) !== latLonKey(selectedCity)),
          ].slice(0, 5),
        })),
      setUnit: (unit) => set({ unit }),
      setChartVariant: (chartVariant) => set({ chartVariant }),
      setActiveView: (activeView) => set({ activeView }),
      setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
    }),
    {
      name: 'climato-v3',
      onRehydrateStorage: () => (state) => {
        if (state && !state.selectedCity?.lat) state.selectedCity = defaultCity
      },
    }
  )
)
