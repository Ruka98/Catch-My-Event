"use client"

import React, { useEffect, useState, useMemo } from "react"
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
  Users,
  Eye,
  ArrowLeft,
  Share2,
  Compass,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  VenueInfo,
  getVenueBySlug,
  groupVenueEvents,
  extractShowtimes,
  POPULAR_VENUES,
} from "@/lib/venues/venue-helper"

export default function VenueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [venue, setVenue] = useState<VenueInfo | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow" | "weekend" | "upcoming" | "all">("today")

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
        }
      } catch (err) {
        console.error("Failed to load venue events:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchVenueEvents()
  }, [])

  const grouped = useMemo(() => {
    if (!venue) return { today: [], tomorrow: [], thisWeekend: [], upcoming: [], allEvents: [] }
    return groupVenueEvents(events, venue)
  }, [events, venue])

  // Automatically select the first tab with events if 'today' is empty
  useEffect(() => {
    if (grouped.today.length > 0) setActiveTab("today")
    else if (grouped.tomorrow.length > 0) setActiveTab("tomorrow")
    else if (grouped.thisWeekend.length > 0) setActiveTab("weekend")
    else if (grouped.upcoming.length > 0) setActiveTab("upcoming")
    else setActiveTab("all")
  }, [grouped])

  if (!venue) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Banner Hero */}
      <div className="relative h-64 sm:h-80 w-full bg-slate-950 overflow-hidden">
        <img
          src={venue.image_url}
          alt={venue.name}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

        {/* Back link & breadcrumb */}
        <div className="absolute top-6 left-4 sm:left-8 z-10">
          <Link
            href="/venues"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white text-xs font-medium backdrop-blur-xs transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> All Venues & Cinemas
          </Link>
        </div>

        {/* Hero Venue Details */}
        <div className="absolute bottom-6 left-4 sm:left-8 right-4 sm:right-8 text-white space-y-2 max-w-4xl">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-sky-600/90 text-white font-semibold text-xs border-0 backdrop-blur-xs">
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

            <span className="text-xs text-slate-300 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-sky-400" /> {venue.city}, Sri Lanka
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {venue.name}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">{venue.address}</p>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 relative z-20">
        {/* Action & Metadata Card */}
        <Card className="p-4 sm:p-5 bg-white border-slate-200/90 shadow-md rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                {grouped.allEvents.length} Confirmed Events & Screenings
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified Place
              </span>
            </div>
            {venue.description && (
              <p className="text-xs text-slate-500 max-w-xl">{venue.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none"
            >
              <Button size="sm" className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs h-9 shadow-xs font-semibold">
                <Navigation className="h-3.5 w-3.5 mr-1.5" />
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
                <Button size="sm" variant="outline" className="w-full text-xs h-9">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Official Site
                </Button>
              </a>
            )}
          </div>
        </Card>

        {/* Schedule Section */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-sky-600" />
                Place Schedule & Showtimes
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live timetable for movies, drama, concerts, and exhibitions at this venue.
              </p>
            </div>

            {/* Date Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-xl shadow-xs overflow-x-auto">
              <button
                onClick={() => setActiveTab("today")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "today"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                🔥 Today ({grouped.today.length})
              </button>

              <button
                onClick={() => setActiveTab("tomorrow")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "tomorrow"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                ☀️ Tomorrow ({grouped.tomorrow.length})
              </button>

              <button
                onClick={() => setActiveTab("weekend")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "weekend"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                🍿 This Weekend ({grouped.thisWeekend.length})
              </button>

              <button
                onClick={() => setActiveTab("upcoming")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "upcoming"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                📅 Upcoming ({grouped.upcoming.length})
              </button>

              <button
                onClick={() => setActiveTab("all")}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                All ({grouped.allEvents.length})
              </button>
            </div>
          </div>

          {/* Event Cards Grid */}
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-500">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto mb-2" />
              Loading schedule for {venue.name}...
            </div>
          ) : activeList.length === 0 ? (
            <Card className="py-16 px-6 text-center bg-white border-dashed border-slate-300 rounded-2xl space-y-3">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                No events found for {activeTab === "today" ? "today" : activeTab === "tomorrow" ? "tomorrow" : "this timeframe"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No scheduled screenings or performances right now. Check other date tabs or browse upcoming shows!
              </p>
              {grouped.allEvents.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("all")}
                  className="mt-2 text-xs"
                >
                  View All {grouped.allEvents.length} Scheduled Events
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeList.map((event) => {
                const showtimes = extractShowtimes(event.time)
                const isCinema = venue.isCinema || event.category === "Movies" || event.category === "Cinema"

                return (
                  <Card
                    key={event.id}
                    className="p-4 bg-white border-slate-200/90 shadow-sm hover:shadow-md hover:border-sky-300 transition-all rounded-2xl flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start gap-3.5">
                      <Link href={`/events/${event.id}`} className="shrink-0 group">
                        <img
                          src={
                            event.image_url ||
                            "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=200&auto=format&fit=crop&q=80"
                          }
                          alt={event.title}
                          className="h-28 w-24 rounded-xl object-cover bg-slate-100 border border-slate-200 group-hover:scale-105 transition-transform"
                        />
                      </Link>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-normal text-slate-600 bg-slate-50">
                            {event.category || "Event"}
                          </Badge>
                          <span className="text-[11px] font-bold text-slate-800">
                            📅 {event.date}
                          </span>
                        </div>

                        <Link href={`/events/${event.id}`}>
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 hover:text-sky-600 transition-colors line-clamp-2 leading-snug">
                            {event.title}
                          </h3>
                        </Link>

                        {/* Cinema Showtimes or Standard Time */}
                        {isCinema ? (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
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
                          <p className="text-xs text-slate-500 flex items-center gap-1 pt-0.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {event.time || "Time TBA"}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Price and Action Footer */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Admission / Ticket</span>
                        <span className="font-bold text-slate-900 text-sm">
                          {event.price === 0 || event.price == null ? (
                            <span className="text-emerald-600">Free Admission</span>
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
                            <Button size="sm" className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-8 px-3">
                              <Ticket className="h-3.5 w-3.5 mr-1" />
                              Book Tickets
                            </Button>
                          </a>
                        ) : (
                          <Link href={`/events/${event.id}`}>
                            <Button size="sm" variant="outline" className="text-xs h-8 px-3">
                              View Event
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Other Popular Venues Carousel / Grid */}
        <div className="mt-14 pt-8 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Explore Other Places & Theatres</h3>
              <p className="text-xs text-slate-500">Popular convention halls, movie theatres, and stadiums in Sri Lanka</p>
            </div>
            <Link href="/venues" className="text-xs font-semibold text-sky-600 hover:underline">
              View All Venues &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {POPULAR_VENUES.filter((v) => v.slug !== venue.slug).slice(0, 4).map((v) => (
              <Link
                key={v.slug}
                href={`/venues/${v.slug}`}
                className="group p-3 rounded-xl bg-white border border-slate-200 hover:border-sky-300 hover:shadow-xs transition-all space-y-2"
              >
                <div className="h-24 rounded-lg overflow-hidden bg-slate-100">
                  <img
                    src={v.image_url}
                    alt={v.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                    {v.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">{v.city} • {v.typeLabel}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
