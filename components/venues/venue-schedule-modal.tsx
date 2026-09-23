"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Navigation,
  ExternalLink,
  Film,
  Sparkles,
  Users,
  Eye,
  CheckCircle2,
  Share2,
  Building2,
  Compass,
} from "lucide-react"
import {
  VenueInfo,
  groupVenueEvents,
  extractShowtimes,
} from "@/lib/venues/venue-helper"

interface VenueScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  venue: VenueInfo | null
  events: any[]
}

export function VenueScheduleModal({
  isOpen,
  onClose,
  venue,
  events,
}: VenueScheduleModalProps) {
  const [activeTab, setActiveTab] = useState<"today" | "tomorrow" | "weekend" | "upcoming" | "all">("today")

  const grouped = useMemo(() => {
    if (!venue) return { today: [], tomorrow: [], thisWeekend: [], upcoming: [], allEvents: [] }
    return groupVenueEvents(events, venue)
  }, [events, venue])

  if (!venue) return null

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl overflow-hidden border-slate-200">
        {/* Venue Cover Image & Header */}
        <div className="relative h-48 sm:h-56 w-full bg-slate-900 overflow-hidden">
          <img
            src={venue.image_url}
            alt={venue.name}
            className="w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          {/* Close button handled by Dialog, info overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-sky-500/90 text-white font-semibold text-xs border-0 backdrop-blur-xs">
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
                <MapPin className="h-3 w-3 text-sky-400" /> {venue.city}, Sri Lanka
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white line-clamp-1">
              {venue.name}
            </h2>

            <p className="text-xs text-slate-300 line-clamp-1">{venue.address}</p>
          </div>
        </div>

        {/* Action Bar (Directions, Website) */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-600 flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-sky-600" />
            <span className="font-semibold text-slate-900">{grouped.allEvents.length} Total Events</span> scheduled at this venue
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium transition-colors shadow-xs"
            >
              <Navigation className="h-3.5 w-3.5" />
              Get Directions
            </a>

            {venue.website_url && (
              <a
                href={venue.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Official Site
              </a>
            )}
          </div>
        </div>

        {/* Schedule Tabs */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex-1 min-w-[90px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === "today"
                  ? "bg-white text-sky-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🔥 Today ({grouped.today.length})
            </button>

            <button
              onClick={() => setActiveTab("tomorrow")}
              className={`flex-1 min-w-[95px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === "tomorrow"
                  ? "bg-white text-sky-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              ☀️ Tomorrow ({grouped.tomorrow.length})
            </button>

            <button
              onClick={() => setActiveTab("weekend")}
              className={`flex-1 min-w-[110px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === "weekend"
                  ? "bg-white text-sky-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🍿 Weekend ({grouped.thisWeekend.length})
            </button>

            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex-1 min-w-[100px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === "upcoming"
                  ? "bg-white text-sky-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📅 Upcoming ({grouped.upcoming.length})
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all text-center ${
                activeTab === "all"
                  ? "bg-white text-sky-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All ({grouped.allEvents.length})
            </button>
          </div>
        </div>

        {/* Events / Screenings List */}
        <div className="p-5 pt-2 space-y-3">
          {activeList.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No events scheduled for {activeTab === "today" ? "today" : activeTab === "tomorrow" ? "tomorrow" : "this period"}.
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Check upcoming dates or explore what else is happening at other venues in {venue.city}.
              </p>
              {grouped.allEvents.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("all")}
                  className="mt-3 text-xs"
                >
                  View All {grouped.allEvents.length} Upcoming Events Here
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.map((event) => {
                const showtimes = extractShowtimes(event.time)
                const isCinema = venue.isCinema || event.category === "Movies" || event.category === "Cinema"

                return (
                  <div
                    key={event.id}
                    className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-sky-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3.5"
                  >
                    {/* Event Flyer Thumbnail */}
                    <Link href={`/events/${event.id}`} className="shrink-0 group">
                      <img
                        src={
                          event.image_url ||
                          "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=160&auto=format&fit=crop&q=80"
                        }
                        alt={event.title}
                        className="h-24 w-24 sm:h-20 sm:w-20 rounded-lg object-cover bg-slate-100 border border-slate-200 group-hover:scale-105 transition-transform"
                      />
                    </Link>

                    {/* Details Column */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] font-normal text-slate-600">
                          {event.category || "General"}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-700">
                          📅 {event.date}
                        </span>
                        {event.is_featured && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-800">
                            Featured
                          </span>
                        )}
                      </div>

                      <Link href={`/events/${event.id}`}>
                        <h4 className="font-bold text-sm text-slate-900 hover:text-sky-600 transition-colors line-clamp-1">
                          {event.title}
                        </h4>
                      </Link>

                      {/* Showtimes for Movies or Regular Timing */}
                      {isCinema ? (
                        <div className="space-y-1 pt-0.5">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Film className="h-3 w-3 text-sky-600" /> Daily Showtimes:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {showtimes.map((st, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-semibold font-mono"
                              >
                                {st}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {event.time || "Time TBD"}
                        </p>
                      )}

                      {/* Price & Attendees */}
                      <div className="flex items-center gap-3 text-xs pt-0.5">
                        <span className="font-semibold text-slate-900">
                          {event.price === 0 || event.price == null ? (
                            <span className="text-emerald-600">Free Admission</span>
                          ) : (
                            `LKR ${event.price.toLocaleString()}`
                          )}
                        </span>
                        {event.views ? (
                          <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                            <Eye className="h-3 w-3" /> {event.views} views
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Ticket & Details Action */}
                    <div className="flex sm:flex-col items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {event.website_url ? (
                        <a
                          href={event.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full sm:w-auto"
                        >
                          <Button size="sm" className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs h-8">
                            <Ticket className="h-3.5 w-3.5 mr-1" />
                            Book Seats
                          </Button>
                        </a>
                      ) : (
                        <Link href={`/events/${event.id}`} className="w-full sm:w-auto">
                          <Button size="sm" variant="outline" className="w-full text-xs h-8">
                            View Event
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
