/**
 * venue-helper.ts
 * Sri Lanka Venue, Cinema, and Landmark Schedule Helper
 */

import { parseISO, isToday, isTomorrow, isWeekend, isAfter, startOfDay, addDays } from "date-fns"

export interface VenueInfo {
  slug: string
  name: string
  aliases: string[]
  type: "cinema" | "theatre" | "auditorium" | "hotel" | "stadium" | "park" | "mall" | "landmark"
  typeLabel: string
  city: string
  address: string
  lat: number
  lng: number
  image_url: string
  website_url?: string
  isCinema?: boolean
  description?: string
}

export const POPULAR_VENUES: VenueInfo[] = []


/**
 * Normalizes text for matching
 */
function clean(str: string | null | undefined): string {
  if (!str) return ""
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Creates a URL-safe slug from a venue name
 */
export function slugifyVenue(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Finds a recognized venue by slug, or creates a dynamic fallback venue
 */
export function getVenueBySlug(slug: string): VenueInfo | null {
  const match = POPULAR_VENUES.find((v) => v.slug === slug)
  if (match) return match

  // Fallback: search by name similarity or return null
  const decoded = decodeURIComponent(slug).replace(/-/g, " ")
  const matchedFromText = matchVenueFromText(decoded)
  if (matchedFromText) return matchedFromText

  return null
}

/**
 * Matches any raw venue string to a known VenueInfo
 */
export function matchVenueFromText(venueText: string | null | undefined): VenueInfo | null {
  if (!venueText) return null
  const text = clean(venueText)

  for (const v of POPULAR_VENUES) {
    if (v.aliases.some((alias) => text.includes(clean(alias)))) {
      return v
    }
    if (clean(v.name).includes(text) || text.includes(clean(v.name))) {
      return v
    }
  }

  return null
}

export interface GroupedVenueEvents {
  today: any[]
  tomorrow: any[]
  thisWeekend: any[]
  upcoming: any[]
  allEvents: any[]
}

/**
 * Filters and groups events for a venue into Today, Tomorrow, This Weekend, and Upcoming
 */
export function groupVenueEvents(events: any[], venue: VenueInfo | string): GroupedVenueEvents {
  const targetVenue = typeof venue === "string" ? venue : venue.name
  const targetAliases = typeof venue === "string" ? [venue] : venue.aliases

  // Filter events matching this venue
  const matched = events.filter((e) => {
    const vText = clean(e.venue || "")
    const locText = clean(e.location || "")
    const full = `${vText} ${locText}`

    if (typeof venue === "object") {
      return venue.aliases.some((a) => full.includes(clean(a))) || full.includes(clean(venue.name))
    }
    return full.includes(clean(targetVenue))
  })

  const now = new Date()
  const todayStart = startOfDay(now)
  const tomorrowStart = startOfDay(addDays(now, 1))

  const today: any[] = []
  const tomorrow: any[] = []
  const thisWeekend: any[] = []
  const upcoming: any[] = []

  matched.forEach((e) => {
    if (!e.date) {
      upcoming.push(e)
      return
    }

    try {
      const eventDate = parseISO(e.date)
      const eventDateStart = startOfDay(eventDate)

      // Check if event is Today
      if (isToday(eventDate) || (e.end_date && now >= eventDate && now <= parseISO(e.end_date))) {
        today.push(e)
      } else if (isTomorrow(eventDate)) {
        tomorrow.push(e)
      } else if (isWeekend(eventDate) && isAfter(eventDateStart, todayStart)) {
        thisWeekend.push(e)
      } else {
        upcoming.push(e)
      }
    } catch {
      upcoming.push(e)
    }
  })

  // Sort each bucket by date ascending
  const sortByDate = (a: any, b: any) => (a.date || "").localeCompare(b.date || "")
  today.sort(sortByDate)
  tomorrow.sort(sortByDate)
  thisWeekend.sort(sortByDate)
  upcoming.sort(sortByDate)

  return {
    today,
    tomorrow,
    thisWeekend,
    upcoming,
    allEvents: matched.sort(sortByDate),
  }
}

/**
 * Extracts cinema movie showtimes from event time string or description
 * E.g. "10:30, 13:30, 16:30, 19:00" -> ["10:30 AM", "01:30 PM", "04:30 PM", "07:00 PM"]
 */
export function extractShowtimes(timeStr: string | null | undefined): string[] {
  if (!timeStr) return []
  const rawParts = timeStr.replace(/[()]/g, "").split(/[,|;/]/)
  const times: string[] = []

  rawParts.forEach((part) => {
    const trimmed = part.trim()
    if (!trimmed) return
    const match = trimmed.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i)
    if (match) {
      const rawHour = parseInt(match[1], 10)
      const min = match[2]
      const ampm = match[3]?.toUpperCase()
      if (ampm) {
        times.push(`${rawHour.toString().padStart(2, "0")}:${min} ${ampm}`)
      } else {
        const period = rawHour >= 12 ? "PM" : "AM"
        const hour12 = rawHour % 12 || 12
        times.push(`${hour12.toString().padStart(2, "0")}:${min} ${period}`)
      }
    }
  })

  return times
}

/**
 * Calculates rough distance in kilometers between two lat/lng coordinates (Haversine formula)
 */
export function calculateDistanceKm(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number | null {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Formats distance in km into a human-friendly label
 */
export function formatDistance(km: number | null | undefined): string | null {
  if (km == null || isNaN(km)) return null
  if (km < 1) {
    return `${Math.round(km * 1000)} m away`
  }
  if (km < 10) {
    return `${km.toFixed(1)} km away`
  }
  return `~${Math.round(km)} km away`
}

export interface EventVenueItem {
  slug: string
  name: string
  city: string
  address: string
  lat?: number | null
  lng?: number | null
  image_url: string
  eventCount: number
  typeLabel: string
  categories: string[]
  distanceKm?: number | null
}

/**
 * Dynamically extracts unique places from the available events list,
 * calculating rough distance if user coordinates are provided.
 */
export function extractPlacesFromEvents(
  events: any[],
  userCoords?: { lat: number; lng: number } | null
): EventVenueItem[] {
  const map = new Map<string, EventVenueItem>()

  for (const e of events) {
    const rawVenue = (e.venue || e.location || "").trim()
    if (!rawVenue) continue

    const matched = matchVenueFromText(rawVenue)
    const slug = matched?.slug || slugifyVenue(rawVenue)

    const existing = map.get(slug)
    if (existing) {
      existing.eventCount += 1
      if (e.category && !existing.categories.includes(e.category)) {
        existing.categories.push(e.category)
      }
      if ((!existing.image_url || existing.image_url.includes("unsplash")) && e.image_url) {
        existing.image_url = e.image_url
      }
    } else {
      const lat = e.latitude != null ? Number(e.latitude) : matched?.lat ?? null
      const lng = e.longitude != null ? Number(e.longitude) : matched?.lng ?? null
      const dist =
        userCoords && lat != null && lng != null
          ? calculateDistanceKm(userCoords.lat, userCoords.lng, lat, lng)
          : null

      const initialCats: string[] = e.category ? [e.category] : []

      map.set(slug, {
        slug,
        name: matched?.name || rawVenue,
        city: e.city || matched?.city || (e.location && e.location !== rawVenue ? e.location : "Sri Lanka"),
        address: e.address || matched?.address || rawVenue,
        lat,
        lng,
        image_url:
          e.image_url ||
          matched?.image_url ||
          "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
        eventCount: 1,
        typeLabel: e.category ? `${e.category}` : "Event Place",
        categories: initialCats,
        distanceKm: dist,
      })
    }
  }

  const items = Array.from(map.values())
  // If userCoords provided, sort nearest first, else by most active events
  if (userCoords) {
    items.sort((a, b) => {
      if (a.distanceKm != null && b.distanceKm != null) {
        return a.distanceKm - b.distanceKm
      }
      if (a.distanceKm != null) return -1
      if (b.distanceKm != null) return 1
      return b.eventCount - a.eventCount
    })
  } else {
    items.sort((a, b) => b.eventCount - a.eventCount)
  }

  return items
}

