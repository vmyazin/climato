import { useEffect } from 'react'
import type { City, GeoCity } from '../data/cities'
import { MONTHS_LONG } from '../data/cities'
import { nameFromSlug } from '../lib/route'

const DEFAULT_TITLE = 'Climato — Monthly Averages'
const DEFAULT_DESCRIPTION =
  "What's the weather really like in any city? See monthly averages — temperature, rainfall and sunshine hours — and the best time to visit."

function setMeta(name: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

interface Args {
  selectedCity: GeoCity
  city: City | undefined
  isPlaceholderData: boolean
  notFoundSlug: string | null
}

export function useDocumentMeta({ selectedCity, city, isPlaceholderData, notFoundSlug }: Args) {
  useEffect(() => {
    if (notFoundSlug) {
      const label = nameFromSlug(notFoundSlug)
      document.title = `${label} — not found · Climato`
      setMeta('description', DEFAULT_DESCRIPTION)
      return
    }

    const name = selectedCity.name
    const country = selectedCity.country
    document.title = `${name} Monthly Weather Averages — Climato`

    const haveFreshClimate = !!city && !isPlaceholderData
    if (haveFreshClimate) {
      const peakIdx = city.high.indexOf(Math.max(...city.high))
      const peakMonth = MONTHS_LONG[peakIdx]
      const peakTemp = city.high[peakIdx]
      setMeta(
        'description',
        `Monthly temperature highs, lows, rainfall and sunshine hours for ${name}, ${country}. Average high in ${peakMonth}: ${peakTemp}°C.`,
      )
    } else {
      setMeta(
        'description',
        `Monthly temperature highs, lows, rainfall and sunshine hours for ${name}, ${country}.`,
      )
    }
  }, [selectedCity, city, isPlaceholderData, notFoundSlug])

  useEffect(() => {
    return () => {
      document.title = DEFAULT_TITLE
      setMeta('description', DEFAULT_DESCRIPTION)
    }
  }, [])
}
