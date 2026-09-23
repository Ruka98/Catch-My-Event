"use client"

import React, { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Navigation,
  ExternalLink,
  Film,
  Building2,
  ArrowLeft,
  Share2,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  VenueInfo,
  getVenueBySlug,
  groupVenueEvents,
  extractShowtimes,
  calculateDistanceKm,
  formatDistance,
  extractPlacesFromEvents,
  EventVenueItem,
  POPULAR_VENUES,
} from "@/lib/venues/venue-helper"

export default function VenueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const slug = params?.slug as string

  const [venue, setVenue] = useState<VenueInfo | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"all" | "today" | "tomorrow" | "weekend" | "upcoming">("all")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Get user's current geolocation for distance calculations
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          // Location permission denied or unavailable
        }
      )
    }
  }, [])

  useEffect(() => {
    if (!slug) return
    const matched = getVenueBySlug(slug)

    if (matched) {
      setVenue(matched)
    } else {
      // Dynamic fallback venue for custom names
      const decodedName = decodeURIComponent(slug).replace(/-/g, " ")
      setVenue({
        slug,
        name: decodedName.charAt(0).toUpperCase() + decodedName.slice(1),
        aliases: [decodedName],
        type: "landmark",
        typeLabel: "Local Venue",
        city: "Sri Lanka",
        address: decodedName,
        lat: 6.9271,
        lng: 79.8612,
        image_url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
      })
    }
  }, [slug])

  useEffect(() => {
    const fetchVenueEvents = async () => {
      setLoading(true)
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from("events")
          .select(`
            id,
            title,
            category,
            subcategory,
            date,
            end_date,
            time,
            venue,
            location,
            latitude,
            longitude,
            price,
            image_url,
            is_featured,
            status,
            views,
            website_url,
            contact_phone,
            created_at
          `)
          .eq("status", "published")
          .order("date", { ascending: true })

        if (!error && data) {
          setEvents(data)

          // Update venue details with real database event info
          const matchedEvent = data.find((e: any) => {
            const raw = (e.venue || e.location || "").trim()
            return slugifyVenue(raw) === slug
          })
          if (matchedEvent) {
            const rawName = (matchedEvent.venue || matchedEvent.location || "").trim()
            setVenue((prev) => ({
              slug,
              name: rawName || prev?.name || "Event Place",
              aliases: [rawName],
              type: "landmark",
              typeLabel: matchedEvent.category || "Event Place",
              city: matchedEvent.city || matchedEvent.location || "Sri Lanka",
              address: matchedEvent.address || rawName,
              lat: matchedEvent.latitude != null ? Number(matchedEvent.latitude) : prev?.lat ?? 6.9271,
              lng: matchedEvent.longitude != null ? Number(matchedEvent.longitude) : prev?.lng ?? 79.8612,
              image_url: matchedEvent.image_url || prev?.image_url || "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
            }))
          }
        }
      } catch (err) {
        console.error("Failed to load venue events:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchVenueEvents()
  }, [slug])

  const grouped = useMemo(() => {
    if (!venue) return { today: [], tomorrow: [], thisWeekend: [], upcoming: [], allEvents: [] }
    return groupVenueEvents(events, venue)
  }, [events, venue])

  // Automatically select the first tab with events if available
  useEffect(() => {
    if (grouped.today.length > 0) setActiveTab("today")
    else if (grouped.tomorrow.length > 0) setActiveTab("tomorrow")
    else if (grouped.thisWeekend.length > 0) setActiveTab("weekend")
    else if (grouped.upcoming.length > 0) setActiveTab("upcoming")
    else setActiveTab("all")
  }, [grouped])

  // Distance from user to the current venue
  const currentVenueDistance = useMemo(() => {
    if (!userLocation || !venue || venue.lat == null || venue.lng == null) return null
    return calculateDistanceKm(userLocation.lat, userLocation.lng, venue.lat, venue.lng)
  }, [userLocation, venue])

  // Dynamically extract other places that actually have available events
  const otherPlaces = useMemo(() => {
    if (!venue) return []

    // Get unique places strictly from real database events
    const placesFromEvents = extractPlacesFromEvents(events, userLocation).filter(
      (p) => p.slug !== venue.slug
    )

    return placesFromEvents.slice(0, 4)
  }, [events, venue, userLocation])

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : ""
    const title = venue ? `${venue.name} Events & Schedule` : "Catch My Event Place"
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl })
        return
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied!",
        description: "Place link copied to your clipboard.",
      })
    }
  }, [venue, toast])

  if (!venue) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-sky-100">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
      </div>
    )
  }

  const activeList =
    activeTab === "today"
      ? grouped.today
      : activeTab === "tomorrow"
      ? grouped.tomorrow
      : activeTab === "weekend"
      ? grouped.thisWeekend
      : activeTab === "upcoming"
      ? grouped.upcoming
      : grouped.allEvents

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${venue.lat},${venue.lng}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 pb-16">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* Main Place Hero Card */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-sky-100/70">
          {/* Hero Banner with Venue Photo */}
          <div className="relative min-h-[220px] sm:min-h-[280px] md:min-h-[320px] w-full bg-slate-950 flex items-end overflow-hidden">
            {/* Ambient Blurred Backdrop */}
            {venue.image_url && (
              <img
                src={venue.image_url}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-40 scale-110"
              />
            )}

            {/* Main Cover Image */}
            <img
              src={venue.image_url}
              alt={venue.name}
              className="absolute inset-0 h-full w-full object-cover opacity-75"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80"
              }}
            />

            {/* Dark gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

            {/* Top Back Pill */}
            <div className="absolute top-4 left-4 z-20">
              <Link
                href="/venues"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>All Places</span>
              </Link>
            </div>

            {/* Title & Metadata Overlaid at the Bottom */}
            <div className="relative z-10 w-full p-5 sm:p-7 text-white space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-600/95 text-white border-0 text-xs font-semibold px-2.5 py-1 shadow-sm backdrop-blur">
                  {venue.isCinema ? (
                    <span className="flex items-center gap-1">
                      <Film className="h-3 w-3" /> {venue.typeLabel}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {venue.typeLabel}
                    </span>
                  )}
                </Badge>

                <span className="flex items-center gap-1 text-xs text-white/90 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur">
                  <MapPin className="h-3 w-3 text-sky-400" /> {venue.city}, Sri Lanka
                </span>

                {/* Rough Distance to Venue */}
                {currentVenueDistance != null && (
                  <span className="flex items-center gap-1 text-xs text-emerald-300 bg-black/50 px-2.5 py-1 rounded-full backdrop-blur font-semibold border border-emerald-500/30">
                    <Navigation className="h-3 w-3 text-emerald-400" />
                    {formatDistance(currentVenueDistance)}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight drop-shadow-md">
                {venue.name}
              </h1>

              {venue.address && (
                <p className="text-xs sm:text-sm text-white/80 max-w-2xl">
                  {venue.address}
                </p>
              )}
            </div>
          </div>

          {/* Place Description & Actions Bar */}
          <div className="p-5 sm:p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {grouped.allEvents.length}{" "}
                  {grouped.allEvents.length === 1 ? "Event Hosted Here" : "Events Hosted Here"}
                </span>
              </div>
              {venue.description && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {venue.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm h-10 px-4 rounded-xl font-semibold shadow-xs">
                  <Navigation className="h-3.5 w-3.5 mr-1.5 text-emerald-300" />
                  Get Directions
                </Button>
              </a>

              {venue.website_url && (
                <a
                  href={venue.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="outline" className="w-full border-sky-200 text-sky-800 hover:bg-sky-50 text-xs sm:text-sm h-10 px-3.5 rounded-xl font-medium">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Website
                  </Button>
                </a>
              )}

              <Button
                variant="outline"
                onClick={handleShare}
                className="border-sky-200 text-gray-700 hover:bg-sky-50 rounded-xl h-10 w-10 p-0 shrink-0"
                title="Share this place"
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Schedule & Events Section */}
        <div className="space-y-4 pt-2">
          {/* Header & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-600" />
                Events at {venue.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Live timetable and scheduled happenings at this location.
              </p>
            </div>

            {/* Mobile-Friendly Horizontal Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-sky-100 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab("all")}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "all"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
                }`}
              >
                All ({grouped.allEvents.length})
              </button>

              <button
                onClick={() => setActiveTab("today")}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "today"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
                }`}
              >
                Today ({grouped.today.length})
              </button>

              <button
                onClick={() => setActiveTab("tomorrow")}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "tomorrow"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
                }`}
              >
                Tomorrow ({grouped.tomorrow.length})
              </button>

              <button
                onClick={() => setActiveTab("weekend")}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "weekend"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
                }`}
              >
                This Weekend ({grouped.thisWeekend.length})
              </button>

              <button
                onClick={() => setActiveTab("upcoming")}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === "upcoming"
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
                }`}
              >
                Upcoming ({grouped.upcoming.length})
              </button>
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="py-20 text-center text-sm text-gray-500">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto mb-2" />
              Loading events for {venue.name}...
            </div>
          ) : activeList.length === 0 ? (
            <Card className="py-16 px-6 text-center bg-white border border-dashed border-sky-200 rounded-3xl space-y-3">
              <Calendar className="h-12 w-12 text-sky-300 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">
                No events scheduled for {activeTab === "today" ? "today" : activeTab === "tomorrow" ? "tomorrow" : "this timeframe"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
                There are currently no events matching this date filter. Try checking the other date tabs or browse all events!
              </p>
              {grouped.allEvents.length > 0 && activeTab !== "all" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("all")}
                  className="mt-2 text-xs border-sky-200 text-sky-700 hover:bg-sky-50 rounded-xl"
                >
                  View All ({grouped.allEvents.length}) Events
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeList.map((event) => {
                const isCinema = venue.isCinema || event.category === "Movies" || event.category === "Cinema"
                const showtimes = isCinema ? extractShowtimes(event.time) : []

                return (
                  <Card
                    key={event.id}
                    className="p-4 bg-white border border-sky-100/90 shadow-xs hover:shadow-md hover:border-sky-300 transition-all rounded-2xl flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start gap-3.5">
                      {/* Event Flyer Thumbnail */}
                      <Link href={`/events/${event.id}`} className="shrink-0 group overflow-hidden rounded-xl">
                        <img
                          src={
                            event.image_url ||
                            "/placeholder.svg"
                          }
                          alt={event.title}
                          className="h-28 w-20 sm:w-24 rounded-xl object-cover bg-slate-100 border border-sky-100 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = "/placeholder.svg"
                          }}
                        />
                      </Link>

                      {/* Content */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-semibold text-sky-700 bg-sky-50 border-sky-200">
                            {event.category || "Event"}
                          </Badge>
                          <span className="text-[11px] font-bold text-gray-800">
                            📅 {event.date}
                          </span>
                        </div>

                        <Link href={`/events/${event.id}`}>
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 hover:text-sky-600 transition-colors line-clamp-2 leading-snug">
                            {event.title}
                          </h3>
                        </Link>

                        {/* Cinema Daily Showtimes */}
                        {isCinema && showtimes.length > 0 ? (
                          <div className="space-y-1 pt-0.5">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                              <Film className="h-3 w-3 text-sky-600" /> Daily Showtimes:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {showtimes.map((st, idx) => (
                                <span
                                  key={idx}
                                  className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200 text-[10px] font-bold font-mono"
                                >
                                  {st}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 flex items-center gap-1 pt-0.5">
                            <Clock className="h-3.5 w-3.5 text-sky-600" />
                            {event.time || "Time TBA"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price & Action Button Footer */}
                    <div className="pt-2 border-t border-sky-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-gray-400 text-[10px] uppercase font-medium block">Admission</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {event.price === 0 || event.price == null ? (
                            <span className="text-emerald-600">Free</span>
                          ) : (
                            `LKR ${event.price.toLocaleString()}`
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {event.website_url ? (
                          <a
                            href={event.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 px-3 rounded-lg font-medium">
                              <Ticket className="h-3.5 w-3.5 mr-1" />
                              Book
                            </Button>
                          </a>
                        ) : null}

                        <Button asChild size="sm" variant="outline" className="text-xs h-8 px-3 rounded-lg border-sky-200 text-sky-700 hover:bg-sky-50 font-medium">
                          <Link href={`/events/${event.id}`}>
                            Details &rarr;
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Explore Other Places (Dynamically derived from available events) */}
        {otherPlaces.length > 0 && (
          <div className="pt-8 border-t border-sky-200/70 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Explore Other Places</h3>
                <p className="text-xs text-gray-500">Other places and locations hosting events</p>
              </div>
              <Link href="/venues" className="text-xs font-semibold text-sky-600 hover:underline">
                View All Places &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {otherPlaces.map((p) => (
              <Link
                key={p.slug}
                href={`/venues/${p.slug}`}
                className="group p-3 rounded-2xl bg-white border border-sky-100 hover:border-sky-300 hover:shadow-xs transition-all space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="relative h-24 rounded-xl overflow-hidden bg-slate-100">
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80"
                      }}
                    />
                    {/* Event count chip */}
                    {p.eventCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 bg-black/60 backdrop-blur text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        {p.eventCount} {p.eventCount === 1 ? "event" : "events"}
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                      {p.name}
                    </h4>
                    <p className="text-[10px] text-gray-500 truncate">{p.city} • {p.typeLabel}</p>
                  </div>
                </div>

                {/* Rough distance tag if user location is available */}
                {p.distanceKm != null ? (
                  <div className="pt-1.5 border-t border-sky-50 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <Navigation className="h-2.5 w-2.5 text-emerald-600" />
                    <span>{formatDistance(p.distanceKm)}</span>
                  </div>
                ) : (
                  <div className="pt-1.5 border-t border-sky-50 flex items-center gap-1 text-[10px] text-gray-400">
                    <MapPin className="h-2.5 w-2.5" />
                    <span>{p.city}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
        )}
      </main>
    </div>
  )
}
