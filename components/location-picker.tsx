"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, MapPinOff, Search } from "lucide-react"
import { OpenStreetMapProvider } from "leaflet-geosearch"
import type { Map as MapInstance, LeafletEvent } from "leaflet"

type Location = { lat: number; lng: number }

type LocationPickerProps = {
  value: Location | null
  onChange: (value: Location | null) => void
  className?: string
  focus?: Location | null
  focusZoom?: number
}

type GhostPoint = { left: number; top: number }
type LeafletModule = typeof import("leaflet")

export function LocationPicker({ value, onChange, className, focus, focusZoom = 13 }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<MapInstance | null>(null)
  const markerRef = useRef<any>(null)
  const leafletRef = useRef<LeafletModule | null>(null)
  const onChangeRef = useRef(onChange)
  const ghostLatLngRef = useRef<Location | null>(null)
  const draggingPointerIdRef = useRef<number | null>(null)
  const draggedDuringPointerRef = useRef(false)
  const skipClickRef = useRef(false)
  const pointerMoveHandlerRef = useRef<((event: PointerEvent) => void) | null>(null)
  const pointerUpHandlerRef = useRef<((event: PointerEvent) => void) | null>(null)

  const [isMapReady, setIsMapReady] = useState(false)
  const [isPlacing, setIsPlacing] = useState(false)
  const [ghostPoint, setGhostPoint] = useState<GhostPoint | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const searchProviderRef = useRef<OpenStreetMapProvider | null>(null)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const ensureLeaflet = useCallback(async () => {
    if (leafletRef.current) return leafletRef.current
    const leafletModule = await import("leaflet")
    const L = leafletModule.default ?? leafletModule
    leafletRef.current = L
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    })
    return L
  }, [])

  const placeMarker = useCallback(
    async (coords: Location, panTo = false) => {
      const map = mapInstanceRef.current
      if (!map) return
      const L = await ensureLeaflet()
      if (markerRef.current) {
        markerRef.current.setLatLng([coords.lat, coords.lng])
      } else {
        markerRef.current = L.marker([coords.lat, coords.lng], { draggable: true }).addTo(map)
        markerRef.current.on("dragend", () => {
          const latLng = markerRef.current?.getLatLng()
          if (!latLng) return
          onChangeRef.current({ lat: latLng.lat, lng: latLng.lng })
        })
      }
      if (panTo) {
        map.setView([coords.lat, coords.lng], 16)
      }
    },
    [ensureLeaflet],
  )

  const clearMarker = useCallback(() => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
    }
    markerRef.current = null
  }, [])

  const commitPlacement = useCallback(
    (coords: Location, panTo = false) => {
      placeMarker(coords, panTo)
      onChangeRef.current(coords)
    },
    [placeMarker],
  )

  useEffect(() => {
    let isMounted = true
    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current || !isMounted) return
      const L = await ensureLeaflet()
      if (!isMounted || !mapRef.current) return

      searchProviderRef.current = new OpenStreetMapProvider()

      const map = L.map(mapRef.current, {
        center: value ? [value.lat, value.lng] : [7.8731, 80.7718],
        zoom: value ? Math.max(13, focusZoom) : 7,
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map)

      mapInstanceRef.current = map
      setIsMapReady(true)
      if (value) placeMarker(value)
    }
    initMap()
    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
      clearMarker()
      setIsMapReady(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  const triggerSearch = async () => {
    if (!searchQuery) {
      setSearchResults([])
      return
    }
    if (searchProviderRef.current) {
      const results = await searchProviderRef.current.search({ query: searchQuery })
      setSearchResults(results.slice(0, 5))
    }
  }

  const handleSelectSearchResult = (result: any) => {
    const coords: Location = { lat: result.y, lng: result.x }
    commitPlacement(coords, true)
    setIsPlacing(false)
    setSearchQuery(result.label)
    setSearchResults([])
  }

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    const handleClick = (event: LeafletEvent & { latlng: Location }) => {
      if (!isPlacing) return
      commitPlacement(event.latlng)
      setIsPlacing(false)
      setGhostPoint(null)
      ghostLatLngRef.current = null
    }
    const handleMouseMove = (event: any) => {
      if (!isPlacing) return
      const point = event.containerPoint
      if (!point) return
      setGhostPoint({ left: point.x, top: point.y })
      ghostLatLngRef.current = { lat: event.latlng.lat, lng: event.latlng.lng }
    }
    const handleMouseOut = () => {
      if (!isPlacing) return
      setGhostPoint(null)
      ghostLatLngRef.current = null
    }
    map.on("click", handleClick)
    map.on("mousemove", handleMouseMove)
    map.on("mouseout", handleMouseOut)
    return () => {
      map.off("click", handleClick)
      map.off("mousemove", handleMouseMove)
      map.off("mouseout", handleMouseOut)
    }
  }, [commitPlacement, isMapReady, isPlacing])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return
    const container = mapInstanceRef.current.getContainer()
    container.style.cursor = isPlacing ? "crosshair" : ""
  }, [isPlacing, isMapReady])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return
    if (value) {
      placeMarker(value)
      mapInstanceRef.current.setView([value.lat, value.lng], Math.max(mapInstanceRef.current.getZoom(), 13))
    } else {
      clearMarker()
    }
  }, [value, isMapReady, placeMarker, clearMarker])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !focus) return
    mapInstanceRef.current.setView([focus.lat, focus.lng], Math.max(mapInstanceRef.current.getZoom(), focusZoom))
  }, [focus, focusZoom, isMapReady])

  const detachPointerListeners = useCallback(() => {
    if (pointerMoveHandlerRef.current) window.removeEventListener("pointermove", pointerMoveHandlerRef.current)
    if (pointerUpHandlerRef.current) window.removeEventListener("pointerup", pointerUpHandlerRef.current)
    pointerMoveHandlerRef.current = null
    pointerUpHandlerRef.current = null
  }, [])

  const handleMarkerPointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!mapInstanceRef.current) return
    event.preventDefault()
    detachPointerListeners()
    draggingPointerIdRef.current = event.pointerId
    draggedDuringPointerRef.current = false
    skipClickRef.current = false
    const handleWindowPointerMove = (moveEvent: PointerEvent) => {
      if (draggingPointerIdRef.current !== moveEvent.pointerId) return
      draggedDuringPointerRef.current = true
      setIsPlacing(true)
      const map = mapInstanceRef.current
      if (!map) return
      const rect = map.getContainer().getBoundingClientRect()
      const x = moveEvent.clientX - rect.left
      const y = moveEvent.clientY - rect.top
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        setGhostPoint(null)
        ghostLatLngRef.current = null
        return
      }
      setGhostPoint({ left: x, top: y })
      const latLng = map.containerPointToLatLng([x, y])
      ghostLatLngRef.current = { lat: latLng.lat, lng: latLng.lng }
    }
    const handleWindowPointerUp = (upEvent: PointerEvent) => {
      if (draggingPointerIdRef.current !== upEvent.pointerId) return
      detachPointerListeners()
      const didDrag = draggedDuringPointerRef.current
      const dropCoords = ghostLatLngRef.current
      draggingPointerIdRef.current = null
      draggedDuringPointerRef.current = false
      ghostLatLngRef.current = null
      setGhostPoint(null)
      if (didDrag && dropCoords) {
        skipClickRef.current = true
        commitPlacement(dropCoords)
        setIsPlacing(false)
      } else if (didDrag) {
        skipClickRef.current = true
        setIsPlacing(false)
      }
    }
    pointerMoveHandlerRef.current = handleWindowPointerMove
    pointerUpHandlerRef.current = handleWindowPointerUp
    window.addEventListener("pointermove", handleWindowPointerMove)
    window.addEventListener("pointerup", handleWindowPointerUp)
  }, [commitPlacement, detachPointerListeners])

  const handleMarkerButtonClick = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (skipClickRef.current) {
      skipClickRef.current = false
      return
    }
    setGhostPoint(null)
    ghostLatLngRef.current = null
    setIsPlacing((current) => !current)
  }, [])


  const handleClear = () => {
    detachPointerListeners()
    clearMarker()
    setIsPlacing(false)
    setGhostPoint(null)
    ghostLatLngRef.current = null
    onChange(null)
  }

  useEffect(() => detachPointerListeners, [detachPointerListeners])

  return (
    <div className={className}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
      <div className="relative mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchResults.length > 0) {
                    handleSelectSearchResult(searchResults[0]);
                  } else {
                    triggerSearch();
                  }
                }
              }}
              className="w-full pl-10"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
          <Button type="button" onClick={triggerSearch} size="sm">
            Search
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="absolute z-[1200] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
            {searchResults.map((result, index) => (
              <div
                key={index}
                className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSelectSearchResult(result)}
              >
                {result.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative location-picker-container">
        <div
          ref={mapRef}
          className="h-full min-h-[300px] md:min-h-[400px] w-full rounded-md border border-sky-200 shadow-sm"
          tabIndex={0}
        />
        {isPlacing && ghostPoint && (
          <div
            className="pointer-events-none absolute z-[1100] text-sky-600 drop-shadow-md"
            style={{ left: ghostPoint.left, top: ghostPoint.top, transform: "translate(-50%, -100%)" }}
          >
            <MapPin className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant={isPlacing ? "default" : "outline"}
            onPointerDown={handleMarkerPointerDown}
            onClick={handleMarkerButtonClick}
            className={isPlacing ? "bg-sky-600 text-white hover:bg-sky-700" : "bg-white/80"}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {isPlacing ? "Placing pin..." : "Drop a pin"}
          </Button>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000]">
          <div className="pointer-events-auto flex items-center justify-between rounded-md bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur-sm">
            {value ? (
              <span>Selected: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>
            ) : (
              <span>Search, drop a pin, or click the map.</span>
            )}
            {value && (
              <Button type="button" size="sm" variant="ghost" onClick={handleClear} className="-mr-2 h-auto px-2 py-1">
                <MapPinOff className="mr-1.5 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}