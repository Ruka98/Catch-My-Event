"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Users,
  Heart,
  Share2,
  ExternalLink,
  Navigation,
  X,
  Building2,
  Film,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/components/auth-guard"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { slugifyVenue, matchVenueFromText, extractShowtimes } from "@/lib/venues/venue-helper"
import { toggleEventAttendance, toggleEventLike, type EventWithProfile } from "@/lib/supabase/events.client"
import type { EventWithCounts } from "@/lib/supabase/types"

interface EventQuickViewModalProps {
  event: (EventWithProfile | EventWithCounts) | null
  isOpen: boolean
  onClose: () => void
}

export function EventQuickViewModal({ event, isOpen, onClose }: EventQuickViewModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  if (!isOpen || !event) return null

  // Date formatting
  const formattedDate = useMemo(() => {
    try {
      const d = new Date(event.date)
      if (isNaN(d.getTime())) return event.date
      const base = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      if (event.end_date && event.end_date !== event.date) {
        const endD = new Date(event.end_date)
        if (!isNaN(endD.getTime())) {
          return `${base} – ${endD.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
        }
      }
      return base
    } catch {
      return event.date
    }
  }, [event.date, event.end_date])

  const venueName = event.venue || event.location || "Colombo"
  const matchedVenue = matchVenueFromText(event.venue || event.location)
  const venueSlug = matchedVenue?.slug || slugifyVenue(venueName)
  const isCinema = matchedVenue?.type === "cinema" || /cinema|theatre|theater|cineplex|pvr|scope/i.test(venueName)
  const isMovieOrCinema =
    event.category?.toLowerCase() === "movies" ||
    event.category?.toLowerCase() === "cinema" ||
    isCinema
  const showtimes = isMovieOrCinema ? extractShowtimes(event.time) : []

  const priceLabel =
    event.price === null || event.price === undefined
      ? "Price TBD"
      : event.price === 0
      ? "Free Admission"
      : `LKR ${event.price.toLocaleString()}`

  // Optimistic attendance
  const initialAttending =
    "user_is_attending" in event
      ? Boolean(event.user_is_attending)
      : event.event_attendees?.some((a) => a.user_id === user?.id && a.status === "attending") ?? false

  const initialCount =
    "attendee_count" in event
      ? Number(event.attendee_count)
      : event.event_attendees?.filter((a) => a.status === "attending" || a.status === "both").length ?? 0

  const [isAttending, setIsAttending] = useState(initialAttending)
  const [attendeeCount, setAttendeeCount] = useState(initialCount)
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false)

  const handleToggleAttendance = async () => {
    if (!user) {
      toast({
        title: "Sign in to RSVP",
        description: "Please log in to register your attendance for this event.",
      })
      return
    }

    const nextState = !isAttending
    setIsAttending(nextState)
    setAttendeeCount((prev) => prev + (nextState ? 1 : -1))
    setIsUpdatingAttendance(true)

    try {
      await toggleEventAttendance(event.id, user.id, "attending")
      toast({
        title: nextState ? "You're attending!" : "RSVP updated",
        description: nextState ? `Saved for ${event.title}` : "Removed from your attending list",
      })
    } catch {
      setIsAttending(!nextState)
      setAttendeeCount((prev) => prev + (nextState ? -1 : 1))
      toast({
        title: "Error",
        description: "Could not update attendance. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingAttendance(false)
    }
  }

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/events/${event.id}` : ""
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event.title, url })
        return
      } catch {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link Copied!", description: "Event link copied to clipboard." })
    }
  }

  const directionsUrl =
    event.latitude && event.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${event.venue || ""} ${event.location || ""}`.trim() || event.title
        )}`

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md hover:bg-black/75 transition-all"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Hero Image Banner */}
        <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden sm:rounded-t-3xl">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                ;(e.target as HTMLImageElement).src = "/placeholder.svg"
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-600 to-indigo-800 text-white">
              <Sparkles className="h-16 w-16 opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top category & price chips */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            {event.category && (
              <Badge className="bg-sky-500/90 text-white backdrop-blur-md border-0 text-xs px-2.5 py-1 font-semibold">
                {event.category}
              </Badge>
            )}
            <Badge
              className={cn(
                "backdrop-blur-md border-0 text-xs px-2.5 py-1 font-bold",
                event.price === 0 ? "bg-emerald-500/90 text-white" : "bg-white/90 text-gray-900 shadow-sm"
              )}
            >
              {priceLabel}
            </Badge>
          </div>

          {/* Title overlaid on bottom of banner */}
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-md">
              {event.title}
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Key Info Row: Date & Clickable Venue */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date / Time Card */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-sky-50/60 border border-sky-100">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-sky-800 uppercase tracking-wider">Date &amp; Time</div>
                <div className="text-sm font-bold text-gray-900">{formattedDate}</div>
                {event.time && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
                    <Clock className="h-3 w-3 text-sky-600" />
                    <span>{event.time}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Clickable Venue Card */}
            <Link
              href={`/venues/${venueSlug}`}
              onClick={onClose}
              className="group flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-sky-300 hover:bg-sky-50/50 transition-all cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-white group-hover:bg-sky-600 transition-colors shadow-sm">
                {isCinema ? <Film className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600 group-hover:text-sky-700 uppercase tracking-wider">
                    {isCinema ? "Cinema / Theater" : "Venue"}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <div className="text-sm font-bold text-gray-900 group-hover:text-sky-700 truncate">
                  {event.venue || event.location}
                </div>
                <div className="text-xs text-sky-600 font-medium mt-0.5 group-hover:underline">
                  View all events at this place &rarr;
                </div>
              </div>
            </Link>
          </div>

          {/* Showtimes Pill Bar (If Cinema or has showtimes) */}
          {isMovieOrCinema && showtimes.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                <Film className="h-3.5 w-3.5 text-amber-600" />
                <span>Screening Showtimes</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {showtimes.map((st, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-amber-300 text-xs font-bold text-amber-900 shadow-xs"
                  >
                    <Clock className="h-3 w-3 text-amber-600" />
                    {st}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              onClick={handleToggleAttendance}
              disabled={isUpdatingAttendance}
              className={cn(
                "flex-1 h-11 rounded-xl font-bold shadow-sm transition-all gap-2",
                isAttending
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-sky-600 hover:bg-sky-700 text-white"
              )}
            >
              <Users className="h-4 w-4" />
              <span>{isAttending ? "You're Going (RSVP'd)" : "I'm Going"}</span>
              <span className="ml-1 text-xs opacity-80">({attendeeCount})</span>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-11 rounded-xl font-semibold border-gray-200 hover:bg-slate-50 gap-2"
            >
              <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                <Navigation className="h-4 w-4 text-emerald-600" />
                <span>Directions</span>
              </a>
            </Button>

            <Button
              onClick={handleShare}
              variant="outline"
              className="h-11 w-11 p-0 rounded-xl border-gray-200 hover:bg-slate-50"
              title="Share event"
            >
              <Share2 className="h-4 w-4 text-gray-600" />
            </Button>
          </div>

          {/* Description Preview */}
          {event.description && (
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">About Event</h3>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-4 whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}

          {/* Footer with "Open Full Page" button */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            {event.profiles?.display_name && !["anonymous", "anonymous organizer", "community member", "organizer"].includes(event.profiles.display_name.trim().toLowerCase()) ? (
              <div className="text-xs text-gray-500">
                Posted by{" "}
                <span className="font-semibold text-gray-700">
                  {event.profiles.display_name}
                </span>
              </div>
            ) : <div />}
            <Link
              href={`/events/${event.id}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 hover:underline"
            >
              <span>Open Full Event Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
