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
import { SocialTopNav } from "@/components/navigation/social-top-nav"
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

const LeafletMap = forwardRef(function LeafletMap({
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
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [isMapReady, setIsMapReady] = useState(false)

  const centerOnUser = () => {
    if (mapInstanceRef.current && userLocation) {
      mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 13)
    }
  }

  useImperativeHandle(ref, () => ({
    centerOnUser,
    setView: (lat: number, lng: number, zoom: number) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([lat, lng], zoom)
      }
    },
  }));


  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return

    let isMounted = true

    const initMap = async () => {
      try {
        const L = (await import("leaflet")).default

        if (mapInstanceRef.current || !isMounted) return

        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        })

        const map = L.map(mapRef.current, {
          center: [7.8731, 80.7718],
          zoom: 8,
          zoomControl: true,
          attributionControl: true,
        })

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
        }).addTo(map)

        map.on("click", () => {
          onEventSelect(null)
        })

        mapInstanceRef.current = map
        setIsMapReady(true)

        console.log("[v0] Map initialized successfully")
      } catch (error) {
        console.error("[v0] Error initializing map:", error)
      }
    }

    initMap()

    return () => {
      isMounted = false
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
          mapInstanceRef.current = null
          markersRef.current = []
          setIsMapReady(false)
          console.log("[v0] Map cleaned up")
        } catch (error) {
          console.error("[v0] Error cleaning up map:", error)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!isMapReady || !mapInstanceRef.current) return

    const updateMarkers = async () => {
      try {
        const L = (await import("leaflet")).default

        markersRef.current.forEach((marker) => {
          try {
            mapInstanceRef.current.removeLayer(marker)
          } catch (error) {
            console.warn("[v0] Error removing marker:", error)
          }
        })
        markersRef.current = []

        // Modern user location marker
        if (userLocation) {
          const userIcon = L.divIcon({
            className: "custom-user-marker",
            html: `<div style="
              width: 28px;
              height: 28px;
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 12px;
              cursor: pointer;
            ">👤</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })

          const userMarker = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<div style="text-align: center; padding: 8px;">
              <strong style="color: #059669;">📍 Your Location</strong>
              <br><small style="color: #6b7280;">Click events nearby to explore</small>
            </div>`)

          markersRef.current.push(userMarker)
        }

        events.forEach((event) => {
          const hasPreciseCoords =
            event.latitude !== null &&
            event.latitude !== undefined &&
            event.longitude !== null &&
            event.longitude !== undefined

          const preciseLat = hasPreciseCoords ? Number(event.latitude) : undefined
          const preciseLng = hasPreciseCoords ? Number(event.longitude) : undefined

          const fallbackCoords = CITY_COORDS[event.location] || CITY_COORDS["Colombo"]

          const lat = preciseLat ?? fallbackCoords.lat
          const lng = preciseLng ?? fallbackCoords.lng

          const isSelected = selectedEvent === event.id
          const iconSize = isSelected ? 44 : 36
          const iconImageUrl = event.image_url || "/placeholder.svg"

          const eventIcon = L.divIcon({
            className: "custom-event-marker",
            html: `<div style="
              width: ${iconSize}px;
              height: ${iconSize}px;
              background-image: url('${iconImageUrl}');
              background-size: cover;
              background-position: center;
              border-radius: 50%;
              border: ${isSelected ? "3px solid #0ea5e9" : "2px solid white"};
              box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              transition: all 0.2s ease;
            "></div>`,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize / 2, iconSize],
          })

          const eventDate = event.date ? parseISO(event.date) : null
          const formattedDate = eventDate ? format(eventDate, "E, MMM d, yyyy") : "Date TBD"
          const rawTime =
            event.start_time && event.end_time
              ? `${event.start_time.substring(0, 5)} - ${event.end_time.substring(0, 5)}`
              : "Time TBD"

          const marker = L.marker([lat, lng], {
            icon: eventIcon,
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(
              `<div style="min-width: 220px; font-family: system-ui, -apple-system, sans-serif; padding: 4px;">
                <img src="${event.image_url || "/placeholder.svg"}" alt="${event.title}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 6px; margin-bottom: 8px;" />
                <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">${event.title}</h3>
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; color: #6b7280; font-size: 12px;">
                  <div style="display: flex; align-items: center;">
                    <span style="margin-right: 6px;">🗓️</span>
                    <span>${formattedDate}</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="margin-right: 6px;">⏰</span>
                    <span>${rawTime}</span>
                  </div>
                  <div style="display: flex; align-items: center;">
                    <span style="margin-right: 6px;">📍</span>
                    <span>${event.location}</span>
                  </div>
                </div>
                <a href="/events/${event.id}" style="display: block; background-color: #0ea5e9; color: white; padding: 8px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 500; text-align: center;">
                  View Details
                </a>
              </div>`,
            )
            .on("click", (e) => {
              const L = (window as any).L
              if (L) {
                L.DomEvent.stopPropagation(e)
              }
              onEventSelect(event.id)
            })

          markersRef.current.push(marker)

          if (isSelected) {
            marker.openPopup()
          }
        })

        console.log("[v0] Markers updated successfully")
      } catch (error) {
        console.error("[v0] Error updating markers:", error)
      }
    }

    updateMarkers()
  }, [events, selectedEvent, onEventSelect, userLocation, isMapReady])

  return (
    <div className="relative h-full w-full">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"
        integrity="sha512-xodZBNTC5n17Xt2atTPuE1HxjVMSvLVW9ocqUKLsCC5CXdbqCmblAshOMAS6/keqq/sMZMZ19scR4PsZChSR7A=="
        crossOrigin=""
      />

      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
            <p className="text-gray-600">Loading interactive map...</p>
          </div>
        </div>
      )}

      <div ref={mapRef} className="h-full w-full" />

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
LeafletMap.displayName = "LeafletMap"

export default function MapPage() {
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
      <SocialTopNav active="map" />

      {/* Map and UI Container */}
      <div className="relative flex-grow">
        <main className="absolute inset-0 z-0">
          <LeafletMap
            ref={mapRef}
            events={filteredEvents}
            selectedEvent={selectedEvent}
            onEventSelect={setSelectedEvent}
            userLocation={userLocation}
          />
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
            {/* Selected Event Details Card is removed to keep the view focused on the map and popups */}
          </div>
        </div>
      </div>
    </div>
  );
}