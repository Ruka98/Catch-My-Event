"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, MapPinOff, Search } from "lucide-react"
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api"

type Location = { lat: number; lng: number }

type LocationPickerProps = {
  value: Location | null
  onChange: (value: Location | null) => void
  className?: string
  focus?: Location | null
  focusZoom?: number
  height?: string
}

const libraries: "places"[] = ["places"];

export function LocationPicker({ value, onChange, className, focus, focusZoom = 13, height }: LocationPickerProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<google.maps.places.PlaceResult[]>([])
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)

  const mapContainerStyle = {
    width: "100%",
    height: height || "360px",
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    geocoderRef.current = new window.google.maps.Geocoder()
  }, [])

  useEffect(() => {
    if (value && mapRef.current) {
      mapRef.current.panTo(value)
    }
  }, [value?.lat, value?.lng])

  const onMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newLocation = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        onChange(newLocation)
      }
    },
    [onChange],
  )

  const triggerSearch = useCallback(() => {
    if (!searchQuery || !geocoderRef.current) return
    geocoderRef.current.geocode({ address: searchQuery }, (results, status) => {
      if (status === "OK" && results) {
        setSearchResults(results)
      } else {
        setSearchResults([])
      }
    })
  }, [searchQuery])

  const handleSelectSearchResult = (result: google.maps.places.PlaceResult) => {
    if (result.geometry?.location) {
      const newLocation = {
        lat: result.geometry.location.lat(),
        lng: result.geometry.location.lng(),
      }
      onChange(newLocation)
      mapRef.current?.panTo(newLocation)
      mapRef.current?.setZoom(16)
      setSearchQuery(result.formatted_address || "")
      setSearchResults([])
    }
  }

  const handleClear = () => {
    onChange(null)
  }

  const center = value || focus || { lat: 7.8731, lng: 80.7718 };

  return (
    <div className={className}>
      <LoadScript
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
        libraries={libraries}
      >
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
                    triggerSearch();
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
                  {result.formatted_address}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="relative location-picker-container">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={value ? focusZoom : 7}
            onLoad={onMapLoad}
            onClick={onMapClick}
            options={{
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              gestureHandling: "greedy",
            }}
          >
            {value && <Marker position={value} draggable={true} onDragEnd={onMapClick} />}
          </GoogleMap>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[1000]">
            <div className="pointer-events-auto flex items-center justify-between rounded-md bg-white/90 px-3 py-2 text-xs text-gray-600 shadow-sm backdrop-blur-sm">
              {value ? (
                <span>Selected: {value.lat.toFixed(4)}, {value.lng.toFixed(4)}</span>
              ) : (
                <span>Search or click the map to select a location.</span>
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
      </LoadScript>
    </div>
  )
}
