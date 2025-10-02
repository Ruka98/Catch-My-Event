"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react"
import { Button } from "@/components/ui/button"
import { Locate, MapPin, MapPinOff } from "lucide-react"

type Location = { lat: number; lng: number }

type LocationPickerProps = {
  value: Location | null
  onChange: (value: Location | null) => void
  className?: string
  focus?: Location | null
  focusZoom?: number
}

type GhostPoint = { left: number; top: number }

type MapInstance = any

type LeafletModule = typeof import("leaflet")

export function LocationPicker({ value, onChange, className, focus, focusZoom = 13 }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<MapInstance>(null)
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

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const ensureLeaflet = useCallback(async () => {
    if (leafletRef.current) {
      return leafletRef.current
    }

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
    async (coords: Location) => {
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
          const next: Location = { lat: latLng.lat, lng: latLng.lng }
          onChangeRef.current(next)
        })
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
    (coords: Location) => {
      placeMarker(coords)
      onChangeRef.current(coords)
    },
    [placeMarker],
  )

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || typeof window === "undefined") {
      return
    }

    let isMounted = true

    const initMap = async () => {
      const container = mapRef.current
      if (!container || !isMounted) return

      if ((container as any)._leaflet_id) {
        ;(container as any)._leaflet_id = undefined
        container.innerHTML = ""
      }

      const L = await ensureLeaflet()

      if (!isMounted || !mapRef.current) return

      const map = L.map(container, {
        center: value ? [value.lat, value.lng] : [7.8731, 80.7718],
        zoom: value ? Math.max(13, focusZoom) : 7,
        zoomControl: true,
        attributionControl: true,
        doubleClickZoom: true,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map)

      mapInstanceRef.current = map
      setIsMapReady(true)

      if (value) {
        placeMarker(value)
      }
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
  }, [clearMarker, ensureLeaflet, placeMarker, focusZoom])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return

    const map = mapInstanceRef.current

    const handleClick = (event: any) => {
      if (!isPlacing) return
      const coords: Location = { lat: event.latlng.lat, lng: event.latlng.lng }
      commitPlacement(coords)
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
    if (isPlacing) {
      container.style.cursor = "crosshair"
    } else {
      container.style.cursor = ""
    }
  }, [isPlacing, isMapReady])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return

    if (value) {
      placeMarker(value)
      mapInstanceRef.current.setView([value.lat, value.lng], Math.max(mapInstanceRef.current.getZoom(), 13))
    } else {
      clearMarker()
    }
  }, [clearMarker, isMapReady, placeMarker, value])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current || !focus) return

    mapInstanceRef.current.setView(
      [focus.lat, focus.lng],
      Math.max(mapInstanceRef.current.getZoom(), focusZoom),
    )
  }, [focus, focusZoom, isMapReady])

  const updateGhostFromClientPoint = useCallback((clientX: number, clientY: number) => {
    const map = mapInstanceRef.current
    if (!map) return

    const rect = map.getContainer().getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top

    if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
      setGhostPoint(null)
      ghostLatLngRef.current = null
      return
    }

    setGhostPoint({ left: x, top: y })
    const latLng = map.containerPointToLatLng([x, y])
    ghostLatLngRef.current = { lat: latLng.lat, lng: latLng.lng }
  }, [])

  const detachPointerListeners = useCallback(() => {
    if (pointerMoveHandlerRef.current) {
      window.removeEventListener("pointermove", pointerMoveHandlerRef.current)
      pointerMoveHandlerRef.current = null
    }
    if (pointerUpHandlerRef.current) {
      window.removeEventListener("pointerup", pointerUpHandlerRef.current)
      pointerUpHandlerRef.current = null
    }
  }, [])

  const handleMarkerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
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
        updateGhostFromClientPoint(moveEvent.clientX, moveEvent.clientY)
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
    },
    [commitPlacement, detachPointerListeners, updateGhostFromClientPoint],
  )

  const handleMarkerButtonClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      if (skipClickRef.current) {
        skipClickRef.current = false
        return
      }

      setGhostPoint(null)
      ghostLatLngRef.current = null
      setIsPlacing((current) => {
        const next = !current
        if (next) {
          mapInstanceRef.current?.getContainer().focus()
        }
        return next
      })
    },
    [],
  )

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        commitPlacement(coords)
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([coords.lat, coords.lng], 16)
        }
      },
      () => {
        // ignore geolocation errors silently
      },
    )
  }

  const handleClear = () => {
    detachPointerListeners()
    clearMarker()
    setIsPlacing(false)
    setGhostPoint(null)
    ghostLatLngRef.current = null
    onChange(null)
  }

  useEffect(() => {
    return () => {
      detachPointerListeners()
    }
  }, [detachPointerListeners])

  return (
    <div className={className}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />
      <div className="relative">
        <div
          ref={mapRef}
          className="h-64 w-full rounded-md border border-sky-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
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
        {/* Top-right controls - force above Leaflet controls (z≈1000) */}
        <div className="absolute top-3 right-3 z-[1100] flex flex-col gap-2">
          <Button
            type="button"
            size="sm"
            variant={isPlacing ? "default" : "outline"}
            onPointerDown={handleMarkerPointerDown}
            onClick={handleMarkerButtonClick}
            className={isPlacing ? "bg-sky-600 text-white hover:bg-sky-700" : "border-sky-300 text-sky-700 hover:bg-sky-50"}
          >
            <MapPin className="mr-2 h-4 w-4" />
            {isPlacing ? "Tap map to place" : "Drop a pin"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleUseCurrentLocation}
            className="border-sky-300 text-sky-700 hover:bg-sky-50"
          >
            <Locate className="mr-2 h-4 w-4" />
            Use my location
          </Button>
        </div>
        {/* Bottom info bar - also above Leaflet controls */}
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1100]">
          <div className="pointer-events-auto flex items-center justify-between rounded-md bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-sm">
            {value ? (
              <span>
                Selected location: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
              </span>
            ) : (
              <span>
                Click the marker tool, then tap the map or drag the marker icon onto the exact venue. Double-click to zoom just like Google Maps.
              </span>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="-mr-2 h-auto px-2 py-1 text-sky-600 hover:bg-sky-50 hover:text-sky-700"
            >
              <MapPinOff className="mr-1.5 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}