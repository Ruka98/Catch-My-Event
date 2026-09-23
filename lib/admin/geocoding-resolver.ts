/**
 * geocoding-resolver.ts
 * Sri Lanka Intelligent Geocoding & Landmark Engine
 * 
 * Provides:
 * 1. Comprehensive Sri Lanka Landmark & Venue Dictionary
 * 2. Sri Lanka Bounding Box Geofence Validation
 * 3. Haversine Distance Calculation (Distance Deviation)
 * 4. 3-Tier Classification:
 *    - Tier 1: Valid & Matching (That's OK)
 *    - Tier 2: Auto-Resolvable (High Confidence Landmark / Single Match)
 *    - Tier 3: Needs Admin Selection (Ambiguous / Confused / Multiple Candidates)
 */

export interface SriLankaLandmark {
  name: string
  aliases: string[]
  lat: number
  lng: number
  city: string
  district?: string
  venueType: "auditorium" | "hotel" | "stadium" | "theatre" | "park" | "mall" | "landmark"
}

// Bounding box for Sri Lanka mainland & coastal islands
export const SRI_LANKA_BOUNDS = {
  minLat: 5.85,
  maxLat: 9.95,
  minLng: 79.60,
  maxLng: 82.00,
}

// Comprehensive Sri Lankan Landmarks & Venues
export const POPULAR_SRI_LANKA_VENUES: SriLankaLandmark[] = [
  // Theatres & Auditoriums
  {
    name: "Nelum Pokuna Mahinda Rajapaksa Theatre",
    aliases: ["nelum pokuna", "nelum pokuna theatre", "lotus pond theatre"],
    lat: 6.9099,
    lng: 79.8669,
    city: "Colombo",
    venueType: "theatre",
  },
  {
    name: "BMICH (Bandaranaike Memorial International Conference Hall)",
    aliases: ["bmich", "bandaranaike memorial", "bmich colombo", "sirimavo bandaranaike hall"],
    lat: 6.9015,
    lng: 79.8732,
    city: "Colombo",
    venueType: "auditorium",
  },
  {
    name: "Lionel Wendt Art Centre & Memorial Theatre",
    aliases: ["lionel wendt", "lionel wendt theatre", "lionel wendt art centre"],
    lat: 6.9082,
    lng: 79.8624,
    city: "Colombo",
    venueType: "theatre",
  },
  {
    name: "Viharamahadevi Open Air Amphitheatre",
    aliases: ["viharamahadevi amphitheatre", "viharamahadevi open air", "viharamahadevi park theatre"],
    lat: 6.9126,
    lng: 79.8617,
    city: "Colombo",
    venueType: "theatre",
  },
  {
    name: "Bishop's College Auditorium",
    aliases: ["bishops college auditorium", "bishop's college auditorium", "bishops auditorium"],
    lat: 6.9189,
    lng: 79.8542,
    city: "Colombo",
    venueType: "auditorium",
  },
  {
    name: "St. Joseph's College Auditorium",
    aliases: ["st josephs auditorium", "st joseph's auditorium", "st joseph college auditorium"],
    lat: 6.9242,
    lng: 79.8687,
    city: "Colombo",
    venueType: "auditorium",
  },
  {
    name: "Elphinstone Theatre",
    aliases: ["elphinstone theatre", "elphinstone hall", "maradana elphinstone"],
    lat: 6.9312,
    lng: 79.8647,
    city: "Colombo",
    venueType: "theatre",
  },
  {
    name: "Tower Hall Theatre",
    aliases: ["tower hall", "tower hall maradana"],
    lat: 6.9328,
    lng: 79.8631,
    city: "Colombo",
    venueType: "theatre",
  },

  // Major Hotels & Event Lawns
  {
    name: "Galle Face Hotel",
    aliases: ["galle face hotel", "gfh colombo", "chequerboard galle face"],
    lat: 6.9208,
    lng: 79.8450,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Cinnamon Grand Colombo",
    aliases: ["cinnamon grand", "cinnamon grand colombo", "oak room cinnamon grand"],
    lat: 6.9174,
    lng: 79.8496,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Cinnamon Lakeside Colombo",
    aliases: ["cinnamon lakeside", "cinnamon lakeside colombo", "waterside cinnamon lakeside"],
    lat: 6.9318,
    lng: 79.8504,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Cinnamon Life",
    aliases: ["cinnamon life", "cinnamon life integrated resort", "cinnamon life colombo"],
    lat: 6.9232,
    lng: 79.8480,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Shangri-La Colombo",
    aliases: ["shangri-la", "shangri la colombo", "shangri-la hotel"],
    lat: 6.9292,
    lng: 79.8442,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Hilton Colombo",
    aliases: ["hilton colombo", "colombo hilton", "hilton colombo residences"],
    lat: 6.9338,
    lng: 79.8454,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Taj Samudra Colombo",
    aliases: ["taj samudera", "taj samudra", "taj samudra colombo"],
    lat: 6.9247,
    lng: 79.8464,
    city: "Colombo",
    venueType: "hotel",
  },
  {
    name: "Mount Lavinia Hotel",
    aliases: ["mount lavinia hotel", "mlh", "mount lavinia beach hotel"],
    lat: 6.8347,
    lng: 79.8628,
    city: "Mount Lavinia",
    venueType: "hotel",
  },
  {
    name: "Waters Edge Battaramulla",
    aliases: ["waters edge", "water's edge", "waters edge battaramulla"],
    lat: 6.9022,
    lng: 79.9142,
    city: "Battaramulla",
    venueType: "hotel",
  },

  // Sports & Stadiums
  {
    name: "Colombo Racecourse Ground & Promenade",
    aliases: ["colombo racecourse", "racecourse ground", "racecourse promenade", "race course colombo"],
    lat: 6.9056,
    lng: 79.8656,
    city: "Colombo",
    venueType: "stadium",
  },
  {
    name: "CR & FC Grounds",
    aliases: ["cr&fc", "cr & fc", "cr and fc", "longdon place"],
    lat: 6.9053,
    lng: 79.8669,
    city: "Colombo",
    venueType: "stadium",
  },
  {
    name: "Sugathadasa Indoor & Outdoor Stadium",
    aliases: ["sugathadasa stadium", "sugathadasa indoor stadium", "sugathadasa"],
    lat: 6.9458,
    lng: 79.8689,
    city: "Colombo",
    venueType: "stadium",
  },
  {
    name: "R. Premadasa International Cricket Stadium",
    aliases: ["premadasa stadium", "r premadasa", "kettarama stadium", "r. premadasa"],
    lat: 6.9406,
    lng: 79.8711,
    city: "Colombo",
    venueType: "stadium",
  },
  {
    name: "Sinhalese Sports Club (SSC) Grounds",
    aliases: ["ssc ground", "ssc grounds", "sinhalese sports club", "ssc colombo"],
    lat: 6.9067,
    lng: 79.8703,
    city: "Colombo",
    venueType: "stadium",
  },
  {
    name: "Colombo Cricket Club (CCC) Grounds",
    aliases: ["ccc grounds", "colombo cricket club", "ccc ground"],
    lat: 6.9047,
    lng: 79.8687,
    city: "Colombo",
    venueType: "stadium",
  },
  {
    name: "Royal College Sports Complex",
    aliases: ["royal college sports complex", "rcsc", "royal sports complex"],
    lat: 6.9025,
    lng: 79.8601,
    city: "Colombo",
    venueType: "stadium",
  },

  // Parks, Plazas & Public Grounds
  {
    name: "Galle Face Green",
    aliases: ["galle face green", "galle face", "galle face promenade"],
    lat: 6.9271,
    lng: 79.8447,
    city: "Colombo",
    venueType: "park",
  },
  {
    name: "Colombo Lotus Tower",
    aliases: ["lotus tower", "colombo lotus tower", "nelum kuluna"],
    lat: 6.9298,
    lng: 79.8580,
    city: "Colombo",
    venueType: "landmark",
  },
  {
    name: "Independence Memorial Hall & Square",
    aliases: ["independence square", "independence memorial hall", "torrington square"],
    lat: 6.9042,
    lng: 79.8676,
    city: "Colombo",
    venueType: "landmark",
  },
  {
    name: "Port City Colombo",
    aliases: ["port city", "port city colombo", "colombo port city"],
    lat: 6.9388,
    lng: 79.8402,
    city: "Colombo",
    venueType: "landmark",
  },
  {
    name: "Excel World Entertainment Park",
    aliases: ["excel world", "excel world colombo", "excel world entertainment"],
    lat: 6.9192,
    lng: 79.8625,
    city: "Colombo",
    venueType: "park",
  },
  {
    name: "Diyatha Uyana Battaramulla",
    aliases: ["diyatha uyana", "diyatha park", "diyatha uyana battaramulla"],
    lat: 6.8995,
    lng: 79.9168,
    city: "Battaramulla",
    venueType: "park",
  },
  {
    name: "Sri Lanka Exhibition & Convention Centre (SLECC)",
    aliases: ["slecc", "sri lanka exhibition and convention centre", "slecc colombo"],
    lat: 6.9348,
    lng: 79.8532,
    city: "Colombo",
    venueType: "auditorium",
  },

  // Malls
  {
    name: "One Galle Face Mall",
    aliases: ["one galle face", "ogf", "one galle face mall"],
    lat: 6.9273,
    lng: 79.8461,
    city: "Colombo",
    venueType: "mall",
  },
  {
    name: "Havelock City Mall",
    aliases: ["havelock city mall", "havelock mall", "havelock city"],
    lat: 6.8824,
    lng: 79.8673,
    city: "Colombo",
    venueType: "mall",
  },

  // Major Regional Sri Lankan Venues
  {
    name: "Kandy City Centre (KCC)",
    aliases: ["kandy city centre", "kcc kandy", "kcc"],
    lat: 7.2936,
    lng: 80.6370,
    city: "Kandy",
    venueType: "mall",
  },
  {
    name: "Bogambara Stadium Kandy",
    aliases: ["bogambara stadium", "bogambara grounds", "bogambara kandy"],
    lat: 7.2892,
    lng: 80.6331,
    city: "Kandy",
    venueType: "stadium",
  },
  {
    name: "Pallekele International Cricket Stadium",
    aliases: ["pallekele stadium", "pallekele cricket stadium", "pallekelle"],
    lat: 7.2803,
    lng: 80.7228,
    city: "Kandy",
    venueType: "stadium",
  },
  {
    name: "Galle International Cricket Stadium & Fort",
    aliases: ["galle stadium", "galle cricket stadium", "galle fort", "galle fort lighthouse"],
    lat: 6.0270,
    lng: 80.2170,
    city: "Galle",
    venueType: "stadium",
  },
  {
    name: "Nuwara Eliya Racecourse",
    aliases: ["nuwara eliya racecourse", "nuwara eliya golf club", "lake gregory nuwara eliya"],
    lat: 6.9634,
    lng: 80.7719,
    city: "Nuwara Eliya",
    venueType: "park",
  },
  {
    name: "Negombo Beach Park",
    aliases: ["negombo beach", "negombo beach park", "porutota beach"],
    lat: 7.2345,
    lng: 79.8412,
    city: "Negombo",
    venueType: "park",
  },
  {
    name: "Jaffna Cultural Centre & Public Library",
    aliases: ["jaffna library", "jaffna cultural centre", "jaffna fort"],
    lat: 9.6615,
    lng: 80.0155,
    city: "Jaffna",
    venueType: "landmark",
  },
]

// Common Sri Lankan Cities
export const SRI_LANKA_CITIES: Record<string, { lat: number; lng: number }> = {
  colombo: { lat: 6.9271, lng: 79.8612 },
  kandy: { lat: 7.2906, lng: 80.6337 },
  galle: { lat: 6.0535, lng: 80.2210 },
  negombo: { lat: 7.2083, lng: 79.8358 },
  jaffna: { lat: 9.6615, lng: 80.0255 },
  matara: { lat: 5.9549, lng: 80.5550 },
  battaramulla: { lat: 6.9022, lng: 79.9142 },
  "mount lavinia": { lat: 6.8389, lng: 79.8653 },
  dehiwala: { lat: 6.8511, lng: 79.8659 },
  moratuwa: { lat: 6.7730, lng: 79.8816 },
  "nuwara eliya": { lat: 6.9497, lng: 80.7891 },
  anuradhapura: { lat: 8.3114, lng: 80.4037 },
  trincomalee: { lat: 8.5874, lng: 81.2152 },
  batticaloa: { lat: 7.7310, lng: 81.6747 },
  kurunegala: { lat: 7.4863, lng: 80.3623 },
  ratnapura: { lat: 6.7056, lng: 80.3847 },
  badulla: { lat: 6.9934, lng: 81.0550 },
  ella: { lat: 6.8721, lng: 81.0461 },
  gampaha: { lat: 7.0840, lng: 79.9939 },
  kalutara: { lat: 6.5854, lng: 79.9607 },
  hambantota: { lat: 6.1429, lng: 81.1212 },
  tangalle: { lat: 6.0244, lng: 80.7941 },
}

/**
 * Checks if coordinates are within the geographical boundaries of Sri Lanka
 */
export function isWithinSriLanka(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false
  if (isNaN(lat) || isNaN(lng)) return false
  if (lat === 0 && lng === 0) return false
  return (
    lat >= SRI_LANKA_BOUNDS.minLat &&
    lat <= SRI_LANKA_BOUNDS.maxLat &&
    lng >= SRI_LANKA_BOUNDS.minLng &&
    lng <= SRI_LANKA_BOUNDS.maxLng
  )
}

/**
 * Haversine formula: Calculates distance in km between two GPS coordinates
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10 // Rounded to 1 decimal place
}

export interface LocationResolutionResult {
  tier: "tier_1_ok" | "tier_2_auto" | "tier_3_admin"
  statusLabel: string
  distanceDeviationKm?: number
  matchedLandmark?: SriLankaLandmark
  suggestedCandidates?: Array<{
    title: string
    address?: string
    lat: number
    lng: number
    city?: string
    source: string
  }>
  reason?: string
}

/**
 * Evaluates an event's location according to the 3-Tier Workflow:
 * - Tier 1: User gave correct location -> That's OK
 * - Tier 2: Location is missing / incorrect, but recognized automatically -> Auto-Select
 * - Tier 3: Hard / Vague / Ambiguous -> Leave it for Admin to select
 */
export function resolveEventLocation(
  venue: string | null | undefined,
  location: string | null | undefined,
  storedLat: number | null | undefined,
  storedLng: number | null | undefined
): LocationResolutionResult {
  const venueText = (venue || "").trim().toLowerCase()
  const locText = (location || "").trim().toLowerCase()
  const fullText = `${venueText} ${locText}`.trim()

  const hasStoredGps = storedLat != null && storedLng != null && storedLat !== 0 && storedLng !== 0
  const isStoredInSL = hasStoredGps && isWithinSriLanka(storedLat, storedLng)

  // 1. Check if venue matches a popular Sri Lanka Landmark
  const matchingLandmarks: SriLankaLandmark[] = []
  for (const landmark of POPULAR_SRI_LANKA_VENUES) {
    if (
      landmark.aliases.some((alias) => fullText.includes(alias)) ||
      fullText.includes(landmark.name.toLowerCase())
    ) {
      matchingLandmarks.push(landmark)
    }
  }

  // 2. TIER 1 CHECK: User provided valid location?
  if (isStoredInSL) {
    // If we matched a landmark, check if stored GPS is reasonably close to that landmark (< 15 km)
    if (matchingLandmarks.length > 0) {
      const best = matchingLandmarks[0]
      const dist = calculateDistanceKm(storedLat!, storedLng!, best.lat, best.lng)
      if (dist <= 15) {
        return {
          tier: "tier_1_ok",
          statusLabel: "Verified Location",
          distanceDeviationKm: dist,
        }
      } else {
        // High Mismatch! The organizer text says e.g. Kandy but GPS is in Colombo
        return {
          tier: "tier_3_admin",
          statusLabel: `Location Mismatch (${dist} km)`,
          distanceDeviationKm: dist,
          matchedLandmark: best,
          suggestedCandidates: [
            {
              title: best.name,
              lat: best.lat,
              lng: best.lng,
              city: best.city,
              source: "Sri Lanka Landmark DB",
            },
          ],
          reason: `Venue text indicates '${best.name}', but current pin is located ${dist} km away.`,
        }
      }
    }

    // Check against city mentions (e.g. venue says "Kandy" but GPS is in Colombo)
    for (const [cityName, cityCoords] of Object.entries(SRI_LANKA_CITIES)) {
      if (fullText.includes(cityName)) {
        const dist = calculateDistanceKm(storedLat!, storedLng!, cityCoords.lat, cityCoords.lng)
        if (dist > 35) {
          return {
            tier: "tier_3_admin",
            statusLabel: `Location Mismatch (${dist} km)`,
            distanceDeviationKm: dist,
            suggestedCandidates: [
              {
                title: `${cityName.toUpperCase()} Center`,
                lat: cityCoords.lat,
                lng: cityCoords.lng,
                city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
                source: "City Coordinates",
              },
            ],
            reason: `Text explicitly mentions '${cityName}', but pin is ${dist} km away.`,
          }
        }
      }
    }

    // Coordinates are inside Sri Lanka with no red-flag conflicts -> That's OK!
    return {
      tier: "tier_1_ok",
      statusLabel: "Verified Location",
    }
  }

  // If coordinates are set but OUTSIDE Sri Lanka (e.g. 0,0 or foreign country)
  if (hasStoredGps && !isStoredInSL) {
    // Flag as invalid GPS, move to resolution
  }

  // 3. TIER 2 CHECK: Can we automatically resolve it with High Confidence?
  if (matchingLandmarks.length === 1) {
    // Exact single landmark recognized! E.g. "BMICH", "Nelum Pokuna"
    const landmark = matchingLandmarks[0]
    return {
      tier: "tier_2_auto",
      statusLabel: `Auto-Resolvable (${landmark.city})`,
      matchedLandmark: landmark,
      suggestedCandidates: [
        {
          title: landmark.name,
          lat: landmark.lat,
          lng: landmark.lng,
          city: landmark.city,
          source: "High Confidence Landmark Match",
        },
      ],
      reason: `Recognized venue as '${landmark.name}'. Ready for 1-click automatic assignment.`,
    }
  }

  // 4. TIER 3 CHECK: It's hard, ambiguous, or multiple candidates -> Leave for Admin
  if (matchingLandmarks.length > 1) {
    // Multiple matches (e.g. Cinnamon Grand vs Cinnamon Lakeside)
    return {
      tier: "tier_3_admin",
      statusLabel: "Ambiguous (Multiple Venues)",
      suggestedCandidates: matchingLandmarks.map((lm) => ({
        title: lm.name,
        lat: lm.lat,
        lng: lm.lng,
        city: lm.city,
        source: "Suggested Landmark Candidate",
      })),
      reason: `Multiple locations match '${venueText}'. Please select which one applies.`,
    }
  }

  // If a specific city is mentioned without a recognized venue
  for (const [cityName, cityCoords] of Object.entries(SRI_LANKA_CITIES)) {
    if (fullText.includes(cityName)) {
      return {
        tier: "tier_3_admin",
        statusLabel: "Needs Specific Pin",
        suggestedCandidates: [
          {
            title: `${cityName.charAt(0).toUpperCase() + cityName.slice(1)} Area Center`,
            lat: cityCoords.lat,
            lng: cityCoords.lng,
            city: cityName.charAt(0).toUpperCase() + cityName.slice(1),
            source: "City Fallback",
          },
        ],
        reason: `City is known (${cityName}), but specific venue pin needs admin selection.`,
      }
    }
  }

  // Generic or unknown venue (e.g. "Hall", "TBA", empty)
  return {
    tier: "tier_3_admin",
    statusLabel: "Missing / Unresolved Location",
    reason: fullText ? `Venue '${fullText}' could not be matched automatically.` : "No venue specified. Needs location pin.",
    suggestedCandidates: [
      {
        title: "Colombo Center (Default)",
        lat: 6.9271,
        lng: 79.8612,
        city: "Colombo",
        source: "Capital Center",
      },
    ],
  }
}
