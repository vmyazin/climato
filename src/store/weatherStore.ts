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

interface WeatherState {
  selectedCity: GeoCity
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

export const useWeatherStore = create<WeatherState>()(
  persist(
    (set) => ({
      selectedCity: defaultCity,
      unit: 'C',
      chartVariant: 'bar',
      activeView: 'a',
      selectedMonth: new Date().getMonth(),

      setCity: (selectedCity) => set({ selectedCity }),
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
