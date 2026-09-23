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

export const POPULAR_VENUES: VenueInfo[] = [
  // --- CINEMAS & MOVIE THEATERS ---
  {
    slug: "scope-cinemas-colombo-city-centre",
    name: "Scope Cinemas Multiplex – Colombo City Centre",
    aliases: ["scope cinemas", "scope ccc", "colombo city centre cinema", "scope cinemas multiplex", "ccc cinema"],
    type: "cinema",
    typeLabel: "Movie Theatre & Multiplex",
    city: "Colombo",
    address: "137 Sir James Pieris Mawatha, Colombo 02",
    lat: 6.9167,
    lng: 79.8549,
    isCinema: true,
    image_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
    website_url: "https://www.scopecinemas.com",
    description: "Sri Lanka's premier 6-screen multiplex cinema featuring Dolby Atmos sound and ultra-comfortable seating.",
  },
  {
    slug: "pvr-cinemas-one-galle-face",
    name: "PVR Cinemas – One Galle Face Mall",
    aliases: ["pvr", "pvr cinemas", "pvr one galle face", "pvr ogf", "pvr colombo"],
    type: "cinema",
    typeLabel: "Luxury Multiplex & IMAX",
    city: "Colombo",
    address: "One Galle Face Mall, Level 5, 1A Centre Road, Colombo 01",
    lat: 6.9273,
    lng: 79.8461,
    isCinema: true,
    image_url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
    website_url: "https://www.pvrcinemas.lk",
    description: "International 9-screen multiplex with PVR LUXE screens and gourmet cinema dining.",
  },
  {
    slug: "savoy-cinema-wellawatte",
    name: "Savoy 3D Cinema – Wellawatte",
    aliases: ["savoy", "savoy cinema", "savoy 3d", "savoy wellawatte", "savoy colombo"],
    type: "cinema",
    typeLabel: "Iconic Movie Theatre",
    city: "Colombo",
    address: "12 Galle Road, Wellawatte, Colombo 06",
    lat: 6.8742,
    lng: 79.8601,
    isCinema: true,
    image_url: "https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=800&auto=format&fit=crop&q=80",
    website_url: "https://savoycinemas.lk",
    description: "A legendary landmark movie theatre in Colombo screening Hollywood, Bollywood, and Sinhala blockbusters.",
  },
  {
    slug: "liberty-by-scope-cinemas",
    name: "Liberty by Scope Cinemas – Kollupitiya",
    aliases: ["liberty cinema", "liberty by scope", "liberty kollupitiya"],
    type: "cinema",
    typeLabel: "Classic City Cinema",
    city: "Colombo",
    address: "R. A. De Mel Mawatha, Kollupitiya, Colombo 03",
    lat: 6.9114,
    lng: 79.8512,
    isCinema: true,
    image_url: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80",
    website_url: "https://www.scopecinemas.com",
    description: "Heritage movie cinema completely renovated with modern laser projection and luxury screens.",
  },
  {
    slug: "majestic-cineplex-bambalapitiya",
    name: "Majestic Cineplex – Bambalapitiya",
    aliases: ["majestic cineplex", "mc cinema", "majestic cinema", "platinum cinema mc", "gold cinema mc"],
    type: "cinema",
    typeLabel: "Multiplex Cinema",
    city: "Colombo",
    address: "Majestic City, Galle Road, Bambalapitiya, Colombo 04",
    lat: 6.8938,
    lng: 79.8552,
    isCinema: true,
    image_url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&auto=format&fit=crop&q=80",
    description: "Popular multi-screen cinema inside Majestic City mall featuring Platinum, Gold, and Superior screens.",
  },

  // --- THEATRES & CONVENTION CENTRES ---
  {
    slug: "bmich-colombo",
    name: "BMICH (Bandaranaike Memorial International Conference Hall)",
    aliases: ["bmich", "bandaranaike memorial", "bmich colombo", "sirimavo bandaranaike hall", "sirimavo hall"],
    type: "auditorium",
    typeLabel: "Convention Centre & Auditorium",
    city: "Colombo",
    address: "Bauddhaloka Mawatha, Colombo 07",
    lat: 6.9015,
    lng: 79.8732,
    image_url: "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=800&auto=format&fit=crop&q=80",
    website_url: "https://www.bmich.com",
    description: "South Asia's first purpose-built conference hall, hosting Sri Lanka's largest exhibitions, summits, and musical shows.",
  },
  {
    slug: "nelum-pokuna-theatre",
    name: "Nelum Pokuna Mahinda Rajapaksa Theatre",
    aliases: ["nelum pokuna", "nelum pokuna theatre", "lotus pond theatre"],
    type: "theatre",
    typeLabel: "Performing Arts Theatre",
    city: "Colombo",
    address: "110 Ananda Coomaraswamy Mawatha, Colombo 07",
    lat: 6.9099,
    lng: 79.8669,
    image_url: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&auto=format&fit=crop&q=80",
    description: "Architectural masterpiece designed for world-class live concerts, ballet, symphonies, and cultural performances.",
  },
  {
    slug: "lionel-wendt-art-centre",
    name: "Lionel Wendt Art Centre & Memorial Theatre",
    aliases: ["lionel wendt", "lionel wendt theatre", "lionel wendt art centre"],
    type: "theatre",
    typeLabel: "Drama Theatre & Art Gallery",
    city: "Colombo",
    address: "18 Guildford Crescent, Colombo 07",
    lat: 6.9082,
    lng: 79.8624,
    image_url: "https://images.unsplash.com/photo-1469488865564-c2de10f69f96?w=800&auto=format&fit=crop&q=80",
    description: "The historical epicenter of Sri Lankan English and Sinhala theatre, drama, and photography exhibitions.",
  },
  {
    slug: "colombo-racecourse-ground",
    name: "Colombo Racecourse Ground & Promenade",
    aliases: ["colombo racecourse", "racecourse ground", "racecourse promenade", "race course colombo"],
    type: "stadium",
    typeLabel: "Sports Arena & Open Grounds",
    city: "Colombo",
    address: "Reid Avenue, Colombo 07",
    lat: 6.9056,
    lng: 79.8656,
    image_url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80",
    description: "Historic grandstand featuring international rugby matches, open-air food festivals, and live concerts.",
  },
  {
    slug: "galle-face-green",
    name: "Galle Face Green & Promenade",
    aliases: ["galle face green", "galle face", "galle face promenade"],
    type: "park",
    typeLabel: "Oceanfront Promenade & Plaza",
    city: "Colombo",
    address: "Galle Main Road, Colombo 03",
    lat: 6.9271,
    lng: 79.8447,
    image_url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80",
    description: "Iconic ocean-side urban park in Colombo, ideal for outdoor concerts, kite festivals, and night markets.",
  },
  {
    slug: "sugathadasa-stadium",
    name: "Sugathadasa Indoor & Outdoor Stadium",
    aliases: ["sugathadasa stadium", "sugathadasa indoor stadium", "sugathadasa"],
    type: "stadium",
    typeLabel: "National Sports Stadium",
    city: "Colombo",
    address: "Prince of Wales Avenue, Colombo 14",
    lat: 6.9458,
    lng: 79.8689,
    image_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80",
    description: "Sri Lanka's leading arena for large-scale sports championships, indoor concerts, and corporate meets.",
  },
  {
    slug: "kandy-city-centre",
    name: "Kandy City Centre (KCC)",
    aliases: ["kandy city centre", "kcc kandy", "kcc", "kcc multiplex"],
    type: "mall",
    typeLabel: "Commercial & Entertainment Mall",
    city: "Kandy",
    address: "5 Dalada Veediya, Kandy",
    lat: 7.2936,
    lng: 80.637,
    image_url: "https://images.unsplash.com/photo-1519567241046-7f570eee3ce6?w=800&auto=format&fit=crop&q=80",
    description: "The primary entertainment and retail hub of Kandy, featuring a modern cinema multiplex and event halls.",
  },
  {
    slug: "waters-edge-battaramulla",
    name: "Waters Edge Battaramulla",
    aliases: ["waters edge", "water's edge", "waters edge battaramulla"],
    type: "hotel",
    typeLabel: "Luxury Lakeside Venue",
    city: "Battaramulla",
    address: "316 Pannipitiya Road, Battaramulla",
    lat: 6.9022,
    lng: 79.9142,
    image_url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80",
    description: "Scenic lakeside resort and banquet facility hosting culinary fairs, musical fests, and high-profile exhibitions.",
  },
]

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
  if (!timeStr) return ["Showtime TBD"]
  const rawParts = timeStr.replace(/[()]/g, "").split(/[,|;/]/)
  const times: string[] = []

  rawParts.forEach((part) => {
    const trimmed = part.trim()
    if (!trimmed) return
    // Check if format is HH:MM
    if (/^\d{1,2}:\d{2}/.test(trimmed)) {
      const [h, m] = trimmed.split(":")
      const hour = parseInt(h, 10)
      const period = hour >= 12 ? "PM" : "AM"
      const hour12 = hour % 12 || 12
      times.push(`${hour12.toString().padStart(2, "0")}:${m.slice(0, 2)} ${period}`)
    } else {
      times.push(trimmed)
    }
  })

  return times.length > 0 ? times : [timeStr]
}
