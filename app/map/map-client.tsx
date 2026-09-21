"use client"

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react"
import { Calendar, MapPin, Search, Crosshair, Clock, Ticket, Navigation, X, SlidersHorizontal, Scan } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/auth-guard"
import {
  getEventsClient,
  type EventWithProfile,
} from "@/lib/supabase/events.client"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  addWeeks,
  startOfMonth,
  endOfMonth,
  addMonths,
  parseISO,
  isToday,
  isTomorrow,
  format,
} from "date-fns"
import { mainCategories, getSubcategories, categoryColors } from "@/lib/constants/categories"
import { GoogleMap, LoadScript, Marker, OverlayView } from "@react-google-maps/api"

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "Tomorrow", value: "tomorrow" },
  { label: "This Week", value: "this_week" },
  { label: "Next Week", value: "next_week" },
  { label: "This Month", value: "this_month" },
  { label: "Next Month", value: "next_month" },
]

const PRICE_RANGES = [
  { label: "All Prices", value: "all" },
  { label: "Free", value: "free" },
  { label: "Under Rs. 500", value: "under_500" },
  { label: "Rs. 500 - Rs. 1,000", value: "500_1000" },
  { label: "Rs. 1,000 - Rs. 2,000", value: "1000_2000" },
  { label: "Over Rs. 2,000", value: "over_2000" },
]

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  Colombo: { lat: 6.9271, lng: 79.8612 },
  Kandy: { lat: 7.2906, lng: 80.6337 },
  Galle: { lat: 6.0535, lng: 80.221 },
  Negombo: { lat: 7.2083, lng: 79.8358 },
  Jaffna: { lat: 9.6615, lng: 80.0255 },
  Matara: { lat: 5.9549, lng: 80.555 },
  Ella: { lat: 6.8721, lng: 81.0461 },
  "Mount Lavinia": { lat: 6.8389, lng: 79.8653 },
}

function formatPriceInRupees(price: number | null | undefined) {
  if (price === null || price === undefined) return "Price TBD"
  if (price === 0) return "Free"
  return `Rs. ${price.toLocaleString()}`
}

function formatTime(time: string | null | undefined) {
  if (!time) return "Time TBD"
  try {
    const parts = time.replace(/[()]/g, "").split(",")
    const formatSingle = (t: string) => {
      const [hours, minutes] = t.trim().split(":")
      if (!hours) return t
      const d = new Date()
      d.setHours(parseInt(hours, 10))
      d.setMinutes(parseInt(minutes || "0", 10))
      return format(d, "h:mm a")
    }
    if (parts.length > 1) {
      return `${formatSingle(parts[0])} - ${formatSingle(parts[1])}`
    }
    return formatSingle(parts[0])
  } catch {
    return time
  }
}

const libraries: "places"[] = ["places"]

const containerStyle = {
  width: "100%",
  height: "100%",
}

export interface GMapHandle {
  centerOnUser: () => void
  setView: (lat: number, lng: number, zoom: number) => void
  fitBounds: (coords: { lat: number; lng: number }[]) => void
}

const GMap = forwardRef<
  GMapHandle,
  {
    events: EventWithProfile[]
    selectedEvent: string | null
    onEventSelect: (eventId: string | null) => void
    userLocation: { lat: number; lng: number } | null
  }
>(function GMap({ events, selectedEvent, onEventSelect, userLocation }, ref) {
  const mapInstanceRef = useRef<google.maps.Map | null>(null)

  const centerOnUser = useCallback(() => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.panTo(userLocation)
      mapInstanceRef.current.setZoom(13)
    }
  }, [userLocation])

  useImperativeHandle(ref, () => ({
    centerOnUser,
    setView: (lat: number, lng: number, zoom: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat, lng })
        mapInstanceRef.current.setZoom(zoom)
      }
    },
    fitBounds: (coords: { lat: number; lng: number }[]) => {
      if (mapInstanceRef.current && coords.length > 0) {
        if (coords.length === 1) {
          mapInstanceRef.current.panTo(coords[0])
          mapInstanceRef.current.setZoom(14)
          return
        }
        const bounds = new google.maps.LatLngBounds()
        coords.forEach((c) => bounds.extend(c))
        mapInstanceRef.current.fitBounds(bounds, 80)
      }
    },
  }))

  const getEventPosition = useCallback((event: EventWithProfile) => {
    const hasPreciseCoords =
      event.latitude !== null &&
      event.latitude !== undefined &&
      event.longitude !== null &&
      event.longitude !== undefined

    const preciseLat = hasPreciseCoords ? Number(event.latitude) : undefined
    const preciseLng = hasPreciseCoords ? Number(event.longitude) : undefined
    const fallbackCoords = CITY_COORDS[event.location] || CITY_COORDS["Colombo"]

    return {
      lat: preciseLat ?? fallbackCoords.lat,
      lng: preciseLng ?? fallbackCoords.lng,
    }
  }, [])

  const stableMarkerOffset = useCallback(() => ({ x: -27, y: -27 }), [])

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={userLocation || { lat: 7.8731, lng: 80.7718 }}
        zoom={8}
        onLoad={(map) => {
          mapInstanceRef.current = map
        }}
        onClick={() => onEventSelect(null)}
        options={{
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "poi",
              elementType: "geometry",
              stylers: [{ visibility: "off" }],
            },
          ],
        }}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285f4",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2.5,
            }}
          />
        )}

        {events.map((event) => {
          const isSelected = selectedEvent === event.id
          const catColor = categoryColors[event.category || ""] || "#808080"

          return (
            <OverlayView
              key={event.id}
              position={getEventPosition(event)}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={stableMarkerOffset}
            >
              <div
                className="relative cursor-pointer transition-transform duration-150 hover:scale-110 flex items-center justify-center select-none"
                style={{
                  width: "54px",
                  height: "54px",
                  willChange: "transform",
                  transform: "translate3d(0,0,0)",
                  WebkitBackfaceVisibility: "hidden",
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  onEventSelect(event.id)
                }}
              >
                {event.image_url ? (
                  <>
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full overflow-hidden bg-slate-200 transition-all",
                        isSelected ? "ring-4 ring-[#4285f4] shadow-xl scale-105" : "shadow-md"
                      )}
                      style={{
                        width: "46px",
                        height: "46px",
                        border: "2.5px solid #ffffff",
                      }}
                    >
                      <img
                        src={event.image_url}
                        alt={event.title}
                        className="h-[41px] w-[41px] rounded-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                        }}
                      />
                    </div>
                    {/* Category indicator dot matching mobile app */}
                    <div
                      className="absolute rounded-full shadow-md"
                      style={{
                        bottom: "2px",
                        right: "2px",
                        width: "14px",
                        height: "14px",
                        border: "2px solid #ffffff",
                        backgroundColor: catColor,
                      }}
                    />
                  </>
                ) : (
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-full transition-all shadow-md",
                      isSelected ? "ring-4 ring-[#4285f4] shadow-xl scale-105" : ""
                    )}
                    style={{
                      width: "44px",
                      height: "44px",
                      border: "2.5px solid #ffffff",
                      backgroundColor: catColor,
                    }}
                  >
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </OverlayView>
          )
        })}
      </GoogleMap>
    </div>
  )

})

GMap.displayName = "GMap"

export default function MapClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deepLinkedEventId = searchParams.get("eventId")
  const { user } = useAuth()
  const { toast } = useToast()
  const supabaseClient = useMemo(() => createClient(), [])

  // Map & Location State
  const mapRef = useRef<GMapHandle | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [events, setEvents] = useState<EventWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Selection (matching Mobile App)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null)
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>("this_month")

  // Debounce search query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim().toLowerCase()), 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  // Get user geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        () => {
          console.log("Location access denied or unavailable, using Colombo fallback")
          setUserLocation({ lat: 6.9271, lng: 79.8612 })
        }
      )
    } else {
      setUserLocation({ lat: 6.9271, lng: 79.8612 })
    }
  }, [])

  // Load events
  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const eventData = await getEventsClient(user?.id ?? undefined)
      setEvents(eventData)
    } catch (error) {
      console.error("Error loading events:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Realtime subscription
  useEffect(() => {
    const hasRealtime = typeof (supabaseClient as any)?.channel === "function"
    if (!hasRealtime) return

    const channel = (supabaseClient as any)
      .channel("events-map")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        loadEvents()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, () => {
        loadEvents()
      })
      .subscribe()

    return () => {
      if (typeof (supabaseClient as any)?.removeChannel === "function") {
        ;(supabaseClient as any).removeChannel(channel)
      }
    }
  }, [supabaseClient, loadEvents])

  // Coordinates helper
  const getEventCoordinates = useCallback((event: EventWithProfile) => {
    if (
      event.latitude !== null &&
      event.latitude !== undefined &&
      event.longitude !== null &&
      event.longitude !== undefined
    ) {
      return {
        lat: Number(event.latitude),
        lng: Number(event.longitude),
      }
    }
    const fallback = CITY_COORDS[event.location] || CITY_COORDS["Colombo"]
    return fallback ? { ...fallback } : null
  }, [])

  // Handle deep link
  useEffect(() => {
    if (!deepLinkedEventId || events.length === 0) return
    const match = events.find((e) => e.id === deepLinkedEventId)
    if (match) {
      setSelectedEvent(match.id)
      const coords = getEventCoordinates(match)
      if (coords && mapRef.current) {
        mapRef.current.setView(coords.lat, coords.lng, 14)
      }
    }
  }, [deepLinkedEventId, events, getEventCoordinates])

  // Date Filtering Helper (supports single day and multi-day events)
  const eventWithinDatePreset = useCallback(
    (dateStr: string | null | undefined, endDateStr: string | null | undefined, preset: string | null): boolean => {
      if (!preset || preset === "all") return true
      if (!dateStr) return false

      const eventDate = parseISO(dateStr)
      const eventEndDate = endDateStr ? parseISO(endDateStr) : eventDate
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)

      switch (preset) {
        case "today":
          return isWithinInterval(today, { start: eventDate, end: eventEndDate }) || isToday(eventDate)
        case "tomorrow":
          return isWithinInterval(tomorrow, { start: eventDate, end: eventEndDate }) || isTomorrow(eventDate)
        case "this_week": {
          const start = startOfWeek(today, { weekStartsOn: 1 })
          const end = endOfWeek(today, { weekStartsOn: 1 })
          return (
            (eventDate >= start && eventDate <= end) ||
            (eventEndDate >= start && eventEndDate <= end) ||
            (eventDate <= start && eventEndDate >= end)
          )
        }
        case "next_week": {
          const nextWeekStart = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
          const nextWeekEnd = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
          return (
            (eventDate >= nextWeekStart && eventDate <= nextWeekEnd) ||
            (eventEndDate >= nextWeekStart && eventEndDate <= nextWeekEnd) ||
            (eventDate <= nextWeekStart && eventEndDate >= nextWeekEnd)
          )
        }
        case "this_month": {
          const start = startOfMonth(today)
          const end = endOfMonth(today)
          return (
            (eventDate >= start && eventDate <= end) ||
            (eventEndDate >= start && eventEndDate <= end) ||
            (eventDate <= start && eventEndDate >= end)
          )
        }
        case "next_month": {
          const nextMonthDate = addMonths(today, 1)
          const start = startOfMonth(nextMonthDate)
          const end = endOfMonth(nextMonthDate)
          return (
            (eventDate >= start && eventDate <= end) ||
            (eventEndDate >= start && eventEndDate <= end) ||
            (eventDate <= start && eventEndDate >= end)
          )
        }
        default:
          return true
      }
    },
    []
  )

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Category filter
      if (selectedCategory && selectedCategory !== "All" && event.category !== selectedCategory) {
        return false
      }

      // Subcategory filter
      if (selectedSubCategory && selectedSubCategory !== "All" && event.subcategory !== selectedSubCategory) {
        return false
      }

      // Price filter
      const priceValue = event.price ?? 0
      if (selectedPrice && selectedPrice !== "all") {
        switch (selectedPrice) {
          case "free":
            if (priceValue !== 0) return false
            break
          case "under_500":
            if (!(priceValue > 0 && priceValue < 500)) return false
            break
          case "500_1000":
            if (!(priceValue >= 500 && priceValue <= 1000)) return false
            break
          case "1000_2000":
            if (!(priceValue > 1000 && priceValue <= 2000)) return false
            break
          case "over_2000":
            if (!(priceValue > 2000)) return false
            break
        }
      }

      // Date preset filter
      if (!eventWithinDatePreset(event.date, (event as any).end_date, selectedDate)) {
        return false
      }

      // Search query filter
      if (debouncedQuery) {
        const matches =
          (event.title?.toLowerCase().includes(debouncedQuery) ?? false) ||
          (event.description?.toLowerCase().includes(debouncedQuery) ?? false) ||
          (event.category?.toLowerCase().includes(debouncedQuery) ?? false) ||
          (event.subcategory?.toLowerCase().includes(debouncedQuery) ?? false) ||
          (event.address?.toLowerCase().includes(debouncedQuery) ?? false) ||
          (event.city?.toLowerCase().includes(debouncedQuery) ?? false) ||
          (event.location?.toLowerCase().includes(debouncedQuery) ?? false)

        if (!matches) return false
      }

      return true
    })
  }, [events, selectedCategory, selectedSubCategory, selectedPrice, selectedDate, debouncedQuery, eventWithinDatePreset])

  // Autocomplete suggestions
  const topSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.trim().toLowerCase()
    return events
      .filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          (e.city ?? "").toLowerCase().includes(q) ||
          (e.location ?? "").toLowerCase().includes(q) ||
          (e.category ?? "").toLowerCase().includes(q)
      )
      .slice(0, 5)
  }, [searchQuery, events])

  // Selected Event Data
  const selectedEventData = useMemo(() => {
    if (!selectedEvent) return null
    return events.find((e) => e.id === selectedEvent) ?? null
  }, [selectedEvent, events])

  const selectedCoords = useMemo(() => {
    if (!selectedEventData) return null
    return getEventCoordinates(selectedEventData)
  }, [selectedEventData, getEventCoordinates])

  // Event Selection Handler
  const handleSelectEvent = (eventId: string | null) => {
    setSelectedEvent(eventId)
    if (eventId) {
      const match = events.find((e) => e.id === eventId)
      if (match) {
        const coords = getEventCoordinates(match)
        if (coords && mapRef.current) {
          mapRef.current.setView(coords.lat, coords.lng, 14)
        }
      }
    }
  }

  // Suggestion Click Handler
  const handleSelectSuggestion = (item: EventWithProfile) => {
    setSearchQuery(item.title || "")
    setSuggestionsOpen(false)
    handleSelectEvent(item.id)
  }

  // Geocode / Search Submit
  const handleSearchSubmit = () => {
    setSuggestionsOpen(false)
    const term = searchQuery.trim().toLowerCase()
    if (!term) return

    // Match City coords first
    const cityKey = Object.keys(CITY_COORDS).find((c) => c.toLowerCase() === term)
    if (cityKey && mapRef.current) {
      const { lat, lng } = CITY_COORDS[cityKey]
      mapRef.current.setView(lat, lng, 12)
      return
    }

    // Match Event
    const match = events.find(
      (e) =>
        e.title?.toLowerCase().includes(term) ||
        (e.city ?? "").toLowerCase().includes(term) ||
        (e.location ?? "").toLowerCase().includes(term)
    )
    if (match) {
      handleSelectEvent(match.id)
    } else {
      toast({
        title: "No results found",
        description: `Your search for "${searchQuery}" did not match any events.`,
      })
    }
  }

  // Locate User FAB
  const handleMyLocationPress = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation.lat, userLocation.lng, 14)
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setUserLocation(loc)
          mapRef.current?.setView(loc.lat, loc.lng, 14)
        },
        () => {
          toast({
            title: "Location access denied",
            description: "Please enable location services in your browser.",
          })
        }
      )
    }
  }

  // Fit to Results FAB
  const handleFitToResults = () => {
    const coords = filteredEvents
      .map((e) => getEventCoordinates(e))
      .filter((c): c is { lat: number; lng: number } => c !== null)

    if (coords.length > 0 && mapRef.current) {
      mapRef.current.fitBounds(coords)
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100 font-sans">
      {/* Google Map Full View */}
      <div className="absolute inset-0 z-0">
        <LoadScript
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
          libraries={libraries}
          loadingElement={<div className="h-full w-full animate-pulse bg-gray-200" />}
        >
          <GMap
            ref={mapRef}
            events={filteredEvents}
            selectedEvent={selectedEvent}
            onEventSelect={handleSelectEvent}
            userLocation={userLocation}
          />
        </LoadScript>
      </div>

      {/* TOP CONTROLS: Floating Search Bar & Horizontal Date Filter Chips */}
      <div className="pointer-events-none absolute inset-x-0 top-4 z-20 mx-auto max-w-xl px-4 flex flex-col">
        {/* Floating Search Pill Bar */}
        <div className="pointer-events-auto relative flex items-center rounded-full bg-white shadow-lg border border-gray-100 p-1.5 transition-all">
          <Search className="ml-3 h-5 w-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search events, locations, or categories..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSuggestionsOpen(!!e.target.value.trim())
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchSubmit()
            }}
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setSuggestionsOpen(false)
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setModalVisible(true)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#4285f4] text-white shadow transition-all hover:bg-[#3367d6] flex-shrink-0"
            title="Filter Events"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Autocomplete Suggestions Box */}
        {suggestionsOpen && topSuggestions.length > 0 && (
          <div className="pointer-events-auto mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-xl">
            {topSuggestions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                className="flex cursor-pointer items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-gray-50"
              >
                <img
                  src={item.image_url || "/placeholder.svg"}
                  alt={item.title}
                  className="h-10 w-10 rounded-lg object-cover bg-gray-100 flex-shrink-0"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                  <p className="truncate text-xs text-gray-500">
                    {item.address || item.city || item.location || "Location TBD"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Horizontal Date Filter Chips (identical to mobile app) */}
        <div className="pointer-events-auto mt-3 flex items-center space-x-2 overflow-x-auto py-1 no-scrollbar">
          {DATE_RANGES.map((range) => {
            const isActive = selectedDate === range.value
            return (
              <button
                key={range.value}
                type="button"
                onClick={() => setSelectedDate(isActive ? null : range.value)}
                className={cn(
                  "flex-shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-all",
                  isActive
                    ? "bg-[#4285f4] text-white shadow-md hover:bg-[#3367d6]"
                    : "border border-gray-100 bg-white/95 text-gray-700 backdrop-blur-sm hover:bg-white hover:text-gray-900"
                )}
              >
                {range.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* FLOATING ACTION BUTTONS (Bottom-Right Cluster matching Mobile) */}
      <div
        className={cn(
          "pointer-events-auto absolute right-4 z-20 flex flex-col space-y-2.5 transition-all duration-300",
          selectedEventData ? "bottom-64 sm:bottom-56" : "bottom-6"
        )}
      >
        <button
          type="button"
          onClick={handleMyLocationPress}
          title="My Location"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-gray-100 bg-white text-[#4285f4] shadow-lg transition-transform hover:scale-105 active:scale-95 hover:bg-gray-50"
        >
          <Crosshair className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleFitToResults}
          title="Fit to Events"
          className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-gray-100 bg-white text-[#4285f4] shadow-lg transition-transform hover:scale-105 active:scale-95 hover:bg-gray-50"
        >
          <Scan className="h-5 w-5" />
        </button>
      </div>

      {/* SELECTED EVENT BOTTOM SHEET CARD (Matching Mobile App Layout & Actions) */}
      {selectedEventData && (
        <div className="pointer-events-auto absolute inset-x-4 bottom-6 z-20 mx-auto max-w-lg transition-all animate-in fade-in slide-in-from-bottom-6 duration-200">
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gray-100/90 text-gray-600 transition-colors hover:bg-gray-200"
              title="Close card"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Event Info (Clicking opens Event Details) */}
            <div
              onClick={() => router.push(`/events/${selectedEventData.id}`)}
              className="group flex cursor-pointer p-4 transition-colors hover:bg-gray-50/50"
            >
              <img
                src={selectedEventData.image_url || "/placeholder.svg"}
                alt={selectedEventData.title}
                className="h-20 w-20 flex-shrink-0 rounded-xl bg-gray-100 object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                }}
              />
              <div className="ml-3.5 flex min-w-0 flex-1 flex-col justify-center pr-6">
                <h3 className="mb-1.5 line-clamp-2 text-base font-bold leading-snug text-gray-900 transition-colors group-hover:text-blue-600 sm:text-lg">
                  {selectedEventData.title}
                </h3>
                <div className="mb-1 flex items-center text-xs text-gray-600 sm:text-sm">
                  <Calendar className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  <span className="truncate">
                    {selectedEventData.date
                      ? format(parseISO(selectedEventData.date), "E, MMM d, yyyy")
                      : "Date TBD"}
                  </span>
                </div>
                <div className="mb-1 flex items-center text-xs text-gray-600 sm:text-sm">
                  <Clock className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  <span className="truncate">{formatTime(selectedEventData.time)}</span>
                </div>
                <div className="mb-1 flex items-center text-xs text-gray-600 sm:text-sm">
                  <MapPin className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  <span className="truncate">
                    {selectedEventData.address ||
                      selectedEventData.city ||
                      selectedEventData.location ||
                      "Location TBD"}
                  </span>
                </div>
                <div className="mb-1 flex items-center text-xs text-gray-600 sm:text-sm">
                  <Ticket className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
                  <span className="font-semibold text-gray-800">
                    {formatPriceInRupees(selectedEventData.price)}
                  </span>
                </div>
                {(selectedEventData.category || selectedEventData.subcategory) && (
                  <div className="mt-1">
                    <span className="inline-block rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-xs font-semibold text-[#1a73e8]">
                      {selectedEventData.subcategory || selectedEventData.category}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions Row: Navigate (Green) & View Details (Blue) */}
            <div className="flex items-center gap-3 px-4 pb-4 pt-1">
              <a
                href={
                  selectedCoords
                    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedCoords.lat},${selectedCoords.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        selectedEventData.address || selectedEventData.city || selectedEventData.title
                      )}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#34a853] py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2d9248]"
              >
                <Navigation className="h-4 w-4" />
                Navigate
              </a>
              <Link
                href={`/events/${selectedEventData.id}`}
                className="flex flex-1 items-center justify-center rounded-xl bg-[#4285f4] py-2.5 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3367d6]"
              >
                View Details
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* FILTER MODAL (Category, Subcategory, Price matching Mobile) */}
      {modalVisible && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-xl font-bold text-gray-900">Filter Events</h3>
              <button
                type="button"
                onClick={() => setModalVisible(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 py-5">
              {/* Category */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Category</label>
                <select
                  value={selectedCategory || ""}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value || null)
                    setSelectedSubCategory(null)
                  }}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4285f4]"
                >
                  <option value="">All Categories</option>
                  {mainCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategory */}
              {selectedCategory && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Subcategory</label>
                  <select
                    value={selectedSubCategory || ""}
                    onChange={(e) => setSelectedSubCategory(e.target.value || null)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#4285f4]"
                  >
                    <option value="">All Subcategories</option>
                    {getSubcategories(selectedCategory).map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Price Range */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Ticket Price</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PRICE_RANGES.map((p) => {
                    const isSelected =
                      selectedPrice === p.value || (p.value === "all" && !selectedPrice)
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setSelectedPrice(p.value === "all" ? null : p.value)}
                        className={cn(
                          "rounded-xl border px-3 py-2 text-left text-xs font-medium transition-all sm:text-sm cursor-pointer",
                          isSelected
                            ? "border-[#4285f4] bg-blue-50 font-semibold text-[#4285f4]"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        )}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null)
                  setSelectedSubCategory(null)
                  setSelectedPrice(null)
                }}
                className="flex-1 rounded-xl border border-gray-200 py-3 px-4 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalVisible(false)
                  handleFitToResults()
                }}
                className="flex-[2] rounded-xl bg-[#4285f4] py-3 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3367d6]"
              >
                Show Events
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-xs">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4285f4] border-t-transparent" />
            <p className="text-sm font-medium text-gray-600">Finding amazing events near you...</p>
          </div>
        </div>
      )}
    </div>
  )
}
