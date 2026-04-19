import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TopoMapProps {
  lat: number
  lon: number
  width?: number   // kept for prop compat, layout is fluid
  height?: number
  stroke?: string  // unused — kept for compat
  accent?: string
  bg?: string      // unused — kept for compat
}

function RecenterMap({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lon], map.getZoom(), { animate: true, duration: 0.8 })
  }, [lat, lon, map])
  return null
}

export function TopoMap({ lat, lon, height = 320, accent = '#cc3b1f' }: TopoMapProps) {
  const markerIcon = React.useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:${accent};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    [accent]
  )

  return (
    <div style={{ width: '100%', height }}>
      <MapContainer
        center={[lat, lon]}
        zoom={11}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={false}
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA) | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          maxZoom={17}
        />
        <Marker position={[lat, lon]} icon={markerIcon} />
        <RecenterMap lat={lat} lon={lon} />
      </MapContainer>
    </div>
  )
}
