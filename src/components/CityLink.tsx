import React from 'react'
import type { GeoCity } from '../data/cities'
import { toSlug } from '../lib/route'

// Wraps a city name in an anchor that links to its individual page.
// Inherits the parent color and font; the only visual change is a hover
// opacity dip so the user gets feedback without breaking the editorial
// typography of whatever container the link sits in.

interface Props {
  city: GeoCity
  children: React.ReactNode
  style?: React.CSSProperties
}

export function CityLink({ city, children, style }: Props) {
  const { path, query } = toSlug(city)
  return (
    <a
      href={path + query}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.65' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
      style={{
        color: 'inherit',
        textDecoration: 'none',
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </a>
  )
}
