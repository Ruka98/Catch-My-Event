"use client"

import { useState, useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, Search, Locate, Heart, Users, Eye, X, Filter, MessageSquare, Crosshair } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-guard"
import { LikeButton } from "@/components/like-button"
import { ShareButton } from "@/components/share-button"
import {
  getEventsClient,
  searchEventsClient,
  updateEventViews,
  toggleEventAttendance,
  type EventWithProfile,
} from "@/lib/supabase/events.client"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getAttendanceCounts, getAttendanceLabel } from "@/lib/eventAttendance"
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
  subDays,
  parseISO,
  isPast,
  isToday,
  isTomorrow,
  format,
} from "date-fns"
import { mainCategories, getSubcategories } from "@/lib/constants/categories"
import { GoogleMap, LoadScript, Marker, InfoWindow, OverlayView } from "@react-google-maps/api"

const categories = ["All", ...mainCategories]

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

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const libraries: "places"[] = ["places"];

const containerStyle = {
  width: '100%',
  height: '100%',
};

const GMap = forwardRef(function GMap({
  events,
  selectedEvent,
  onEventSelect,
  userLocation,
}: {
  events: EventWithProfile[]
  selectedEvent: string | null
  onEventSelect: (eventId: string | null) => void
  userLocation: { lat: number; lng: number } | null
}, ref) {
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  const centerOnUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.panTo(userLocation);
      mapInstanceRef.current.setZoom(13);
    }
  }

  useImperativeHandle(ref, () => ({
    centerOnUser,
    setView: (lat: number, lng: number, zoom: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(zoom);
      }
    },
  }));

  const selectedEventData = useMemo(() => {
    if (!selectedEvent) return null;
    return events.find(event => event.id === selectedEvent);
  }, [selectedEvent, events]);

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
  }, []);

  const getPixelPositionOffset = (width: number, height: number) => ({
    x: -(width / 2),
    y: -(height / 2),
  });

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={userLocation || { lat: 7.8731, lng: 80.7718 }}
        zoom={8}
        onLoad={map => { mapInstanceRef.current = map }}
        onClick={() => onEventSelect(null)}
        options={{
          panControl: true,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true,
          gestureHandling: "auto",
        }}
      >
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#10b981",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            }}
          />
        )}
        {events.map(event => {
          const isSelected = selectedEvent === event.id;
          const iconSize = isSelected ? 44 : 36;
          return(
          <OverlayView
            key={event.id}
            position={getEventPosition(event)}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => getPixelPositionOffset(iconSize, iconSize)}
          >
            <div
              style={{
                cursor: 'pointer',
              }}
              onClick={() => onEventSelect(event.id)}
            >
              <img
                src={event.image_url || "/placeholder.svg"}
                alt={event.title}
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  borderRadius: '50%',
                  border: isSelected ? '3px solid #0ea5e9' : '2px solid white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  transition: 'all 0.2s ease',
                  objectFit: 'cover',
                }}
              />
            </div>
          </OverlayView>
        )})}
        {selectedEventData && (
          <InfoWindow
            position={getEventPosition(selectedEventData)}
            onCloseClick={() => onEventSelect(null)}
          >
            <div style={{ minWidth: 220, fontFamily: 'system-ui, sans-serif', padding: 4 }}>
              <img src={selectedEventData.image_url || "/placeholder.svg"} alt={selectedEventData.title} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }} />
              <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 600, color: '#111827' }}>{selectedEventData.title}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8, color: '#6b7280', fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 6 }}>🗓️</span>
                  <span>{format(parseISO(selectedEventData.date!), "E, MMM d, yyyy")}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 6 }}>⏰</span>
                  <span>{selectedEventData.start_time?.substring(0, 5)} - {selectedEventData.end_time?.substring(0, 5)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ marginRight: 6 }}>📍</span>
                  <span>{selectedEventData.location}</span>
                </div>
              </div>
              <a href={`/events/${selectedEventData.id}`} style={{ display: 'block', backgroundColor: '#0ea5e9', color: 'white', padding: 8, borderRadius: 6, textDecoration: 'none', fontSize: 12, fontWeight: 500, textAlign: 'center' }}>
                View Details
              </a>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
        {userLocation && (
          <Button
            size="sm"
            variant="outline"
            className="border-sky-200 bg-white/95 backdrop-blur-sm shadow-lg transition-all duration-200 hover:border-sky-300 hover:bg-sky-50"
            onClick={centerOnUser}
          >
            <Crosshair className="h-4 w-4 text-sky-600" />
          </Button>
        )}
      </div>
    </div>
  )
})
GMap.displayName = "GMap"

export default function MapClient() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedSubcategory, setSelectedSubcategory] = useState("All")
  const [subcategories, setSubcategories] = useState<string[]>(["All"])
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [priceFilter, setPriceFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("this-month")
  const [events, setEvents] = useState<EventWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showSearchAndFilter, setShowSearchAndFilter] = useState(false)
  const { user } = useAuth()

  const searchParams = useSearchParams()
  const deepLinkedEventId = searchParams.get("eventId")
  const supabaseClient = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [attendanceUpdating, setAttendanceUpdating] = useState<"interested" | "attending" | null>(null)
  const mapRef = useRef<{ centerOnUser: () => void; setView: (lat: number, lng: number, zoom: number) => void } | null>(null);

  useEffect(() => {
    if (selectedCategory === "All") {
      setSubcategories(["All"])
      setSelectedSubcategory("All")
    } else {
      const newSubcategories = getSubcategories(selectedCategory)
      setSubcategories(["All", ...newSubcategories])
      setSelectedSubcategory("All")
    }
  }, [selectedCategory])

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

    const fallback = CITY_COORDS[event.location]
    return fallback ? { ...fallback } : null
  }, [])

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

  useEffect(() => {
    if (!deepLinkedEventId) return
    const exists = events.some((event) => event.id === deepLinkedEventId)
    if (exists) {
      setSelectedEvent(deepLinkedEventId)
    }
  }, [deepLinkedEventId, events])

  const filteredEvents = events.filter((event) => {
    const priceValue = event.price ?? 0
    const matchesCategory = selectedCategory === "All" || event.category === selectedCategory
    const matchesSubcategory = selectedSubcategory === "All" || event.subcategory === selectedSubcategory

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && priceValue === 0) ||
      (priceFilter === "1-1000" && priceValue > 0 && priceValue <= 1000) ||
      (priceFilter === "1001-2500" && priceValue > 1000 && priceValue <= 2500) ||
      (priceFilter === "2501-5000" && priceValue > 2500 && priceValue <= 5000) ||
      (priceFilter === "5001+" && priceValue > 5000)

    const eventDate = event.date ? parseISO(event.date) : null
    if (!eventDate) return false

    const today = new Date()
    const matchesDate = (() => {
      switch (dateFilter) {
        case "all":
          return true
        case "today":
          return isToday(eventDate)
        case "tomorrow":
          return isTomorrow(eventDate)
        case "this-week":
          return isWithinInterval(eventDate, {
            start: startOfWeek(today, { weekStartsOn: 1 }),
            end: endOfWeek(today, { weekStartsOn: 1 }),
          })
        case "next-week":
          const startOfNextWeek = startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
          const endOfNextWeek = endOfWeek(addWeeks(today, 1), { weekStartsOn: 1 })
          return isWithinInterval(eventDate, { start: startOfNextWeek, end: endOfNextWeek })
        case "this-month":
          return isWithinInterval(eventDate, { start: startOfMonth(today), end: endOfMonth(today) })
        case "next-month":
          const startOfNextMonth = startOfMonth(addMonths(today, 1))
          const endOfNextMonth = endOfMonth(addMonths(today, 1))
          return isWithinInterval(eventDate, { start: startOfNextMonth, end: endOfNextMonth })
        case "recent":
          return isWithinInterval(eventDate, { start: subDays(today, 7), end: today }) && isPast(eventDate)
        default:
          return true
      }
    })()

    return matchesCategory && matchesSubcategory && matchesPrice && matchesDate
  })

  useEffect(() => {
    if (selectedEvent && !filteredEvents.some((event) => event.id === selectedEvent)) {
      setSelectedEvent(null)
    }
  }, [filteredEvents, selectedEvent])

  const selectedEventData = selectedEvent ? events.find((event) => event.id === selectedEvent) ?? null : null
  const selectedAttendanceCounts = selectedEventData
    ? getAttendanceCounts(selectedEventData)
    : { attending: 0, interested: 0 }
  const selectedAttendanceLabel = getAttendanceLabel(selectedAttendanceCounts)
  const selectedAttendeeRecord = user
    ? selectedEventData?.event_attendees?.find((attendee) => attendee.user_id === user.id)
    : null
  const selectedIsGoing = selectedAttendeeRecord?.status === "attending";
  const selectedPriceValue =
    selectedEventData && typeof selectedEventData.price === "number" && !Number.isNaN(selectedEventData.price)
      ? selectedEventData.price
      : null
  const selectedPriceLabel =
    selectedPriceValue === null
      ? "Price TBD"
      : selectedPriceValue === 0
        ? "Free"
        : `LKR ${selectedPriceValue.toLocaleString()}`
  const selectedPriceTone = selectedPriceValue === 0 ? "text-emerald-600" : "text-gray-900"
  const selectedEventDistance = (() => {
    if (!selectedEventData || !userLocation) return null
    const coords = getEventCoordinates(selectedEventData)
    if (!coords) return null
    const distance = calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
    return Number.isFinite(distance) ? Math.round(distance * 10) / 10 : null
  })()
  const highlightEvents = filteredEvents.slice(0, 12)

  const handleViewEvent = async (eventId: string) => {
    try {
      await updateEventViews(eventId)
    } catch (error) {
      console.error("Error recording event view:", error)
    }
  }

  const handleSelectedAttendance = useCallback(
    async (action: "interested" | "attending") => {
      if (!selectedEventData) return
      if (!user) {
        toast({ title: "Sign in to RSVP", description: "Log in to mark yourself interested or going." })
        return
      }
      if (attendanceUpdating) return

      setAttendanceUpdating(action)
      try {
        await toggleEventAttendance(selectedEventData.id, user.id, action)
        await loadEvents()
      } catch (error) {
        console.error("Error updating attendance:", error)
        toast({
          title: "Couldn't update RSVP",
          description: "Please try again in a moment.",
          variant: "destructive",
        })
      } finally {
        setAttendanceUpdating(null)
      }
    },
    [attendanceUpdating, loadEvents, selectedEventData, toast, user],
  )

  const handleSearch = () => {
    setSelectedEvent(null) // Clear any selected event first
    const term = searchTerm.trim().toLowerCase()
    if (!term) return

    // Prioritize zooming to a known city if the search term is a city name
    const cityKey = Object.keys(CITY_COORDS).find(c => c.toLowerCase() === term)
    if (cityKey && mapRef.current) {
      const { lat, lng } = CITY_COORDS[cityKey]
      mapRef.current.setView(lat, lng, 12) // Zoom level 12 for a city
      return
    }

    // If not a city, find the first matching event from the *all* events list and zoom to it
    const eventMatches = events.filter(
      (event) =>
        event.title.toLowerCase().includes(term) || (event.location ?? "").toLowerCase().includes(term),
    )

    if (eventMatches.length > 0) {
      const firstMatch = eventMatches[0]
      const coords = getEventCoordinates(firstMatch)
      if (coords && mapRef.current) {
        mapRef.current.setView(coords.lat, coords.lng, 14) // Zoom level 14 for an event
        setSelectedEvent(firstMatch.id) // Select the found event
      }
    } else {
      toast({
        title: "No results found",
        description: `Your search for "${searchTerm}" did not match any events or locations.`,
      })
    }
  }

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
          console.log("Location access denied")
          setUserLocation({ lat: 6.9271, lng: 79.8612 })
        },
      )
    } else {
      setUserLocation({ lat: 6.9271, lng: 79.8612 })
    }
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col">
      {/* Map and UI Container */}
      <div className="relative flex-grow">
        <main className="absolute inset-0 z-0">
          <LoadScript
            googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
            libraries={libraries}
            loadingElement={<div className="h-full w-full animate-pulse bg-gray-200" />}
          >
            <GMap
              ref={mapRef}
              events={filteredEvents}
              selectedEvent={selectedEvent}
              onEventSelect={setSelectedEvent}
              userLocation={userLocation}
            />
          </LoadScript>
        </main>

        {/* UI Controls Overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-col items-center px-4">
          {!showSearchAndFilter && (
            <div className="pointer-events-auto" onMouseDown={(e) => e.stopPropagation()}>
              <Button
                onClick={() => setShowSearchAndFilter(true)}
                className="h-12 rounded-full bg-white/90 px-6 text-gray-800 shadow-lg backdrop-blur-md hover:bg-white"
              >
                <Search className="mr-2 h-4 w-4" />
                Search & Filter
              </Button>
            </div>
          )}

          {showSearchAndFilter && (
            <div
              className="pointer-events-auto w-full max-w-md self-center rounded-2xl bg-white/90 p-4 shadow-lg backdrop-blur-md"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">Search & Filter</h3>
                <Button variant="ghost" size="sm" onClick={() => setShowSearchAndFilter(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 space-y-4 border-t border-sky-100 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
                  <Input
                    type="text"
                    placeholder="Search events or locations"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="h-12 rounded-full border-2 border-sky-200 bg-white/95 pl-12 pr-4 text-sm shadow-inner focus:border-sky-500 focus:ring-sky-200"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="category-select-map" className="mb-1 block text-xs font-medium text-gray-700">
                      Category
                    </label>
                    <select
                      id="category-select-map"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full rounded-lg border border-sky-200 bg-white/95 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="subcategory-select-map" className="mb-1 block text-xs font-medium text-gray-700">
                      Sub-category
                    </label>
                    <select
                      id="subcategory-select-map"
                      value={selectedSubcategory}
                      onChange={(e) => setSelectedSubcategory(e.target.value)}
                      disabled={selectedCategory === "All" || subcategories.length <= 1}
                      className="w-full rounded-lg border border-sky-200 bg-white/95 px-3 py-2 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      {subcategories.map((subcategory) => (
                        <option key={subcategory} value={subcategory}>
                          {subcategory}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="date-filter-map" className="mb-1 block text-xs font-medium text-gray-700">
                      Date
                    </label>
                    <select
                      id="date-filter-map"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full rounded-lg border border-sky-200 bg-white/95 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="all">All Dates</option>
                      <option value="today">Today</option>
                      <option value="tomorrow">Tomorrow</option>
                      <option value="this-week">This Week</option>
                      <option value="next-week">Next Week</option>
                      <option value="this-month">This Month</option>
                      <option value="next-month">Next Month</option>
                      <option value="recent">Recent Events</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="price-range-select-map" className="mb-1 block text-xs font-medium text-gray-700">
                      Ticket price
                    </label>
                    <select
                      id="price-range-select-map"
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value)}
                      className="w-full rounded-lg border border-sky-200 bg-white/95 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      <option value="all">All prices</option>
                      <option value="free">Free</option>
                      <option value="1-1000">LKR 1 - 1000</option>
                      <option value="1001-2500">LKR 1001 - 2500</option>
                      <option value="2501-5000">LKR 2501 - 5000</option>
                      <option value="5001+">LKR 5001+</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Spacer to push card to the bottom */}
          <div className="flex-grow" />

          {/* Bottom Overlays */}
          <div className="w-full">
            {selectedEventData && (
                 <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-10 mx-auto max-w-sm">
                 <Card className="overflow-hidden rounded-2xl border-2 border-sky-200 shadow-xl">
                   <CardContent className="p-0">
                     <div className="relative">
                       <img
                         src={selectedEventData.image_url ?? "/placeholder.svg"}
                         alt={selectedEventData.title}
                         className="h-48 w-full object-cover"
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                       <div className="absolute bottom-0 left-0 p-4">
                         <h2 className="text-xl font-bold text-white">{selectedEventData.title}</h2>
                         <div className="mt-1 flex items-center space-x-2">
                           <Badge variant="secondary" className="bg-sky-100 text-sky-800">
                             {selectedEventData.category}
                           </Badge>
                           {selectedEventData.subcategory && (
                             <Badge variant="secondary" className="bg-sky-100/80 text-sky-700">
                               {selectedEventData.subcategory}
                             </Badge>
                           )}
                         </div>
                       </div>
                       <Button
                         variant="ghost"
                         size="sm"
                         className="absolute top-2 right-2 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white"
                         onClick={() => setSelectedEvent(null)}
                       >
                         <X className="h-4 w-4" />
                       </Button>
                     </div>

                     <div className="p-4">
                       <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700">
                         <div className="flex items-center">
                           <Calendar className="mr-2 h-4 w-4 text-sky-500" />
                           <span>
                             {selectedEventData.date
                               ? format(parseISO(selectedEventData.date), "E, MMM d, yyyy")
                               : "Date TBD"}
                           </span>
                         </div>
                         <div className="flex items-center">
                           <MapPin className="mr-2 h-4 w-4 text-sky-500" />
                           <span>{selectedEventData.location}</span>
                         </div>
                         {selectedEventDistance !== null && (
                           <div className="flex items-center">
                             <Locate className="mr-2 h-4 w-4 text-sky-500" />
                             <span>{selectedEventDistance} km away</span>
                           </div>
                         )}
                         <div className="flex items-center">
                           <span className={cn("mr-2 font-semibold", selectedPriceTone)}>
                             {selectedPriceLabel}
                           </span>
                         </div>
                       </div>

                       <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                         <div className="flex items-center">
                           <Heart className="mr-1 h-3 w-3" /> {selectedAttendanceCounts.interested} interested
                         </div>
                         <div className="flex items-center">
                           <Users className="mr-1 h-3 w-3" /> {selectedAttendanceCounts.attending} going
                         </div>
                         <div className="flex items-center">
                           <Eye className="mr-1 h-3 w-3" /> {selectedEventData.view_count ?? 0} views
                         </div>
                       </div>

                       <div className="mt-4 grid grid-cols-2 gap-2">
                         <Button
                           variant={selectedIsGoing ? "default" : "outline"}
                           onClick={() => handleSelectedAttendance("attending")}
                           disabled={attendanceUpdating === "attending"}
                         >
                           {selectedIsGoing ? "You're Going!" : "I'm Going"}
                         </Button>
                         <Button
                           variant="outline"
                           onClick={() => handleSelectedAttendance("interested")}
                           disabled={attendanceUpdating === "interested"}
                         >
                           Interested
                         </Button>
                       </div>

                       <div className="mt-2 flex items-center justify-between">
                         <LikeButton
                           eventId={selectedEventData.id}
                           initialLiked={selectedEventData.is_liked}
                           onUpdate={loadEvents}
                         />
                         <ShareButton event={selectedEventData} />
                         <Button variant="ghost" size="sm" asChild>
                           <Link href={`/events/${selectedEventData.id}#comments`}>
                             <MessageSquare className="mr-2 h-4 w-4" />
                             Comments
                           </Link>
                         </Button>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
