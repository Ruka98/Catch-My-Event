/**
 * quality-engine.ts
 * Quality Assurance, Heuristics, Duplicate Detection, and Anti-Bot Engine for Catch-My-Event.
 */

import { resolveEventLocation, LocationResolutionResult } from "./geocoding-resolver"

export interface EventAuditItem {
  id: string
  title: string
  category: string | null
  date: string | null
  end_date?: string | null
  time?: string | null
  venue: string | null
  location?: string | null
  latitude?: number | null
  longitude?: number | null
  price?: number | null
  image_url: string | null
  is_featured?: boolean
  status?: string
  views?: number
  created_at: string | null
  user_id?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  website_url?: string | null
  profiles?: {
    id?: string
    display_name: string | null
    user_name: string | null
    avatar_url: string | null
    is_suspended?: boolean
    suspension_reason?: string | null
  } | null
  attendees_count?: number
}

// -----------------------------------------------------------------------------
// 1. DUPLICATE DETECTION ENGINE
// -----------------------------------------------------------------------------

export interface DuplicateCluster {
  primaryEvent: EventAuditItem
  duplicateEvent: EventAuditItem
  similarityScore: number // 0 to 100
  reasons: string[]
}

/**
 * Tokenizes and normalizes text for fuzzy matching
 */
function cleanText(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Computes Jaccard Similarity on word tokens
 */
function tokenSimilarity(s1: string, s2: string): number {
  const words1 = new Set(cleanText(s1).split(" ").filter((w) => w.length > 2))
  const words2 = new Set(cleanText(s2).split(" ").filter((w) => w.length > 2))
  if (words1.size === 0 || words2.size === 0) return 0

  let intersection = 0
  words1.forEach((w) => {
    if (words2.has(w)) intersection++
  })

  const union = new Set([...Array.from(words1), ...Array.from(words2)]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Levenshtein distance similarity (0 to 1)
 */
function levenshteinSimilarity(s1: string, s2: string): number {
  const a = cleanText(s1)
  const b = cleanText(s2)
  if (a === b) return 1
  if (a.length === 0 || b.length === 0) return 0

  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  const maxLen = Math.max(a.length, b.length)
  const dist = matrix[b.length][a.length]
  return Math.max(0, 1 - dist / maxLen)
}

/**
 * Scans a list of events to identify suspect duplicate clusters
 */
export function findSuspectDuplicates(events: EventAuditItem[]): DuplicateCluster[] {
  const duplicates: DuplicateCluster[] = []
  const checkedPairs = new Set<string>()

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const e1 = events[i]
      const e2 = events[j]

      const pairKey = [e1.id, e2.id].sort().join("::")
      if (checkedPairs.has(pairKey)) continue
      checkedPairs.add(pairKey)

      const reasons: string[] = []
      let similarityScore = 0

      // Exact or very close URL
      if (e1.website_url && e2.website_url && e1.website_url.trim() === e2.website_url.trim()) {
        reasons.push("Identical website or ticketing URL")
        similarityScore = Math.max(similarityScore, 95)
      }

      // Title Similarity
      const levSim = levenshteinSimilarity(e1.title, e2.title)
      const tokSim = tokenSimilarity(e1.title, e2.title)
      const combinedTitleScore = Math.round((levSim * 0.4 + tokSim * 0.6) * 100)

      // Date comparison
      const datesMatch = e1.date && e2.date && e1.date === e2.date

      if (datesMatch) {
        if (combinedTitleScore >= 70) {
          reasons.push(`${combinedTitleScore}% title match on the same date (${e1.date})`)
          similarityScore = Math.max(similarityScore, combinedTitleScore)
        }
      } else if (combinedTitleScore >= 90) {
        reasons.push(`Near-identical title (${combinedTitleScore}%) across dates`)
        similarityScore = Math.max(similarityScore, combinedTitleScore - 10)
      }

      // Same venue check
      const v1 = cleanText(e1.venue)
      const v2 = cleanText(e2.venue)
      if (v1 && v2 && v1 === v2 && datesMatch && combinedTitleScore >= 50) {
        reasons.push(`Same venue '${e1.venue}' and date slot`)
        similarityScore = Math.max(similarityScore, combinedTitleScore + 15)
      }

      // Flag if total similarity >= 75%
      if (similarityScore >= 75) {
        // Choose primary: older event or event with more attendees/views
        const e1Score = (e1.views || 0) + (e1.attendees_count || 0) * 5 + (e1.image_url ? 10 : 0)
        const e2Score = (e2.views || 0) + (e2.attendees_count || 0) * 5 + (e2.image_url ? 10 : 0)

        const [primary, dupe] = e1Score >= e2Score ? [e1, e2] : [e2, e1]

        duplicates.push({
          primaryEvent: primary,
          duplicateEvent: dupe,
          similarityScore: Math.min(100, similarityScore),
          reasons,
        })
      }
    }
  }

  return duplicates
}

// -----------------------------------------------------------------------------
// 2. DATA SANITY & DETAIL ANOMALIES
// -----------------------------------------------------------------------------

export interface SanityIssue {
  type: "past_date" | "invalid_date_range" | "extreme_price" | "test_title" | "placeholder_content" | "invalid_phone"
  severity: "critical" | "warning"
  message: string
}

export function auditEventSanity(event: EventAuditItem): SanityIssue[] {
  const issues: SanityIssue[] = []
  const now = new Date()

  // 1. Past date check
  if (event.date && event.status !== "hidden" && event.status !== "completed") {
    const eventDate = new Date(event.date)
    const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 30) {
      issues.push({
        type: "past_date",
        severity: "warning",
        message: `Event date was ${diffDays} days ago but status is still '${event.status}'.`,
      })
    }
  }

  // 2. Date Range check
  if (event.date && event.end_date) {
    if (new Date(event.end_date) < new Date(event.date)) {
      issues.push({
        type: "invalid_date_range",
        severity: "critical",
        message: `End date (${event.end_date}) is earlier than start date (${event.date}).`,
      })
    }
  }

  // 3. Price Sanity
  if (event.price != null) {
    if (event.price < 0) {
      issues.push({
        type: "extreme_price",
        severity: "critical",
        message: `Ticket price is negative (LKR ${event.price}).`,
      })
    } else if (event.price > 500000) {
      issues.push({
        type: "extreme_price",
        severity: "warning",
        message: `High ticket price (LKR ${event.price.toLocaleString()}) — check for accidental zero typo.`,
      })
    }
  }

  // 4. Test Submissions & Spam Titles
  const lowerTitle = (event.title || "").toLowerCase().trim()
  const spamKeywords = ["test event", "test", "asdf", "qwerty", "testing 123", "sample event"]
  if (spamKeywords.includes(lowerTitle) || lowerTitle.length < 4) {
    issues.push({
      type: "test_title",
      severity: "critical",
      message: `Suspicious test title: '${event.title}'.`,
    })
  }

  // 5. Placeholder venue or description
  const lowerVenue = (event.venue || "").toLowerCase()
  if (lowerVenue === "tba" || lowerVenue === "tbd" || lowerVenue === "to be announced") {
    issues.push({
      type: "placeholder_content",
      severity: "warning",
      message: "Venue is marked as placeholder ('TBA').",
    })
  }

  // 6. Phone validation (Sri Lankan format)
  if (event.contact_phone) {
    const cleanPhone = event.contact_phone.replace(/[^0-9+]/g, "")
    const isSLValid =
      cleanPhone.startsWith("+947") ||
      cleanPhone.startsWith("07") ||
      cleanPhone.startsWith("+9411") ||
      cleanPhone.startsWith("011")
    if (!isSLValid && cleanPhone.length > 5) {
      issues.push({
        type: "invalid_phone",
        severity: "warning",
        message: `Phone '${event.contact_phone}' does not appear to be a standard Sri Lankan contact number.`,
      })
    }
  }

  return issues
}

// -----------------------------------------------------------------------------
// 3. BOT & SPAMMER DETECTION HEURISTICS
// -----------------------------------------------------------------------------

export interface BotSuspectReport {
  isSuspect: boolean
  confidence: number // 0 to 100
  reasons: string[]
}

export function detectBotOrSpam(user: {
  id: string
  created_at: string | null
  display_name: string | null
  user_name: string | null
  events_count?: number
  is_suspended?: boolean
}): BotSuspectReport {
  const reasons: string[] = []
  let confidence = 0

  if (user.is_suspended) {
    return { isSuspect: true, confidence: 100, reasons: ["Account is currently suspended."] }
  }

  const count = user.events_count || 0
  const createdAt = user.created_at ? new Date(user.created_at) : null
  const now = new Date()

  // New account with high event count (> 6 events posted in first 24h)
  if (createdAt) {
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
    if (ageHours < 24 && count >= 5) {
      confidence += 60
      reasons.push(`Brand new account (< 24h old) created ${count} events rapidly.`)
    } else if (ageHours < 72 && count >= 12) {
      confidence += 50
      reasons.push(`Unusually high event submission volume (${count} events in 3 days).`)
    }
  }

  // Generic randomized username pattern (e.g. user_847194 or random strings)
  const username = user.user_name || ""
  if (/^user[0-9]{4,}$/i.test(username) || /^[a-z]{2,3}[0-9]{6,}$/i.test(username)) {
    confidence += 30
    reasons.push("Default randomized bot-like username format.")
  }

  // Missing display name or single character
  if (!user.display_name || user.display_name.trim().length <= 2) {
    confidence += 15
    reasons.push("Incomplete / empty profile name.")
  }

  return {
    isSuspect: confidence >= 50,
    confidence: Math.min(100, confidence),
    reasons,
  }
}

// -----------------------------------------------------------------------------
// 4. PRE-EDIT QUALITY SUGGESTIONS ENGINE
// -----------------------------------------------------------------------------

export interface PreEditSuggestion {
  id: string
  field: "title" | "location" | "date" | "end_date" | "price" | "contact_phone" | "website_url" | "category" | "status"
  title: string
  description: string
  severity: "critical" | "warning" | "optimization"
  currentValue?: any
  suggestedValue: any
  actionLabel: string
  meta?: {
    latitude?: number
    longitude?: number
    venue?: string
    location?: string
    [key: string]: any
  }
}

/**
 * Standardizes a string into Clean Title Case
 */
export function toTitleCase(str: string): string {
  if (!str) return ""
  const minorWords = new Set([
    "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "in", "of", "vs", "via"
  ])
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, index, arr) => {
      if (word.length === 0) return word
      // Keep acronyms like DJ, VIP, BMICH, SL
      const upper = word.toUpperCase()
      if (["DJ", "VIP", "BMICH", "CR&FC", "SSC", "CCC", "KCC", "SLECC", "LKR"].includes(upper)) {
        return upper
      }
      if (index === 0 || index === arr.length - 1 || !minorWords.has(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(" ")
}

/**
 * Standardizes Sri Lankan contact numbers to standard international or clean local format
 */
export function formatSriLankanPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^0-9]/g, "")
  if (digits.startsWith("07") && digits.length === 10) {
    return `+94 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  if (digits.startsWith("947") && digits.length === 11) {
    return `+94 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  }
  if (digits.startsWith("011") && digits.length === 10) {
    return `+94 11 ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return null
}

/**
 * Generates actionable suggestions before editing an event.
 */
export function generatePreEditSuggestions(event: EventAuditItem): PreEditSuggestion[] {
  const suggestions: PreEditSuggestion[] = []
  const title = (event.title || "").trim()

  // 1. Title formatting suggestion
  if (title) {
    const isAllCaps = title === title.toUpperCase() && title.length > 6 && /[A-Z]/.test(title)
    const isAllLower = title === title.toLowerCase() && title.length > 5
    if (isAllCaps || isAllLower) {
      const fixedTitle = toTitleCase(title)
      if (fixedTitle !== title) {
        suggestions.push({
          id: "fix_title_case",
          field: "title",
          title: "Improve Title Typography",
          description: isAllCaps
            ? "Title is in ALL CAPS. Converting to clean Title Case improves readability and click-throughs."
            : "Title is in all lowercase. Standardizing to Title Case gives a professional look.",
          severity: "optimization",
          currentValue: title,
          suggestedValue: fixedTitle,
          actionLabel: "Convert to Title Case",
        })
      }
    }
  }

  // 2. Location Geocoding & Coordinates Mismatch Suggestion
  const locRes = resolveEventLocation(event.venue, event.location, event.latitude, event.longitude)

  if (locRes.distanceDeviationKm !== undefined && locRes.distanceDeviationKm > 15 && locRes.suggestedCandidates && locRes.suggestedCandidates.length > 0) {
    const best = locRes.suggestedCandidates[0]
    suggestions.push({
      id: "fix_location_mismatch",
      field: "location",
      title: "Correct Location Coordinates Mismatch",
      description: `Current map pin is ~${locRes.distanceDeviationKm} km away from venue '${best.title}'. Snap coordinates to verified landmark GPS.`,
      severity: "critical",
      currentValue: `${event.latitude?.toFixed(4) || "None"}, ${event.longitude?.toFixed(4) || "None"}`,
      suggestedValue: `${best.lat.toFixed(4)}, ${best.lng.toFixed(4)}`,
      actionLabel: `Snap Pin to ${best.title}`,
      meta: {
        latitude: best.lat,
        longitude: best.lng,
        venue: event.venue || best.title,
        location: best.city || event.location || "Colombo",
      },
    })
  } else if (locRes.tier === "tier_2_auto" && locRes.suggestedCandidates && locRes.suggestedCandidates.length > 0) {
    const best = locRes.suggestedCandidates[0]
    suggestions.push({
      id: "auto_apply_gps",
      field: "location",
      title: "Auto-Populate Recognized Venue GPS",
      description: `Venue is identified as '${best.title}'. Ready to assign verified GPS coordinates and city '${best.city}'.`,
      severity: "optimization",
      currentValue: "Missing GPS coordinates",
      suggestedValue: `${best.lat.toFixed(4)}, ${best.lng.toFixed(4)} (${best.city})`,
      actionLabel: "Auto-Assign Venue Coordinates",
      meta: {
        latitude: best.lat,
        longitude: best.lng,
        venue: event.venue || best.title,
        location: best.city || event.location || "Colombo",
      },
    })
  } else if (!event.latitude || !event.longitude) {
    suggestions.push({
      id: "missing_coordinates",
      field: "location",
      title: "Missing Map Location Pin",
      description: "This event does not appear on the interactive map or nearby discovery. Select a location pin.",
      severity: "warning",
      currentValue: "None",
      suggestedValue: "Needs Map Pin",
      actionLabel: "Select Location on Map",
      meta: {
        latitude: 6.9271,
        longitude: 79.8612,
        location: event.location || "Colombo",
      },
    })
  }

  // 3. Date sanity suggestions
  if (event.date && event.end_date) {
    if (new Date(event.end_date) < new Date(event.date)) {
      suggestions.push({
        id: "fix_inverted_dates",
        field: "end_date",
        title: "Fix Inverted Date Order",
        description: `End date (${event.end_date}) is earlier than start date (${event.date}).`,
        severity: "critical",
        currentValue: event.end_date,
        suggestedValue: event.date,
        actionLabel: "Set End Date to Start Date",
      })
    }
  }

  const now = new Date()
  if (event.date && event.status !== "hidden" && event.status !== "completed") {
    const eventDate = new Date(event.date)
    const diffDays = Math.floor((now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays > 14) {
      suggestions.push({
        id: "archive_past_event",
        field: "status",
        title: "Archive Past Event",
        description: `This event was held ${diffDays} days ago but is still listed as active. Mark as completed to keep feed fresh.`,
        severity: "warning",
        currentValue: event.status,
        suggestedValue: "completed",
        actionLabel: "Mark as Completed",
      })
    }
  }

  // 4. Ticket price suggestion
  if (event.price != null && event.price < 0) {
    suggestions.push({
      id: "fix_negative_price",
      field: "price",
      title: "Correct Negative Ticket Price",
      description: `Ticket price is negative (LKR ${event.price}). Reset to 0 for Free event.`,
      severity: "critical",
      currentValue: event.price,
      suggestedValue: 0,
      actionLabel: "Set Price to 0 (Free)",
    })
  } else if (event.price != null && event.price > 250000) {
    suggestions.push({
      id: "verify_high_price",
      field: "price",
      title: "Verify Unusually High Ticket Price",
      description: `Price is LKR ${event.price.toLocaleString()}. Please double check if an extra zero was typed by mistake.`,
      severity: "warning",
      currentValue: event.price,
      suggestedValue: Math.round(event.price / 10),
      actionLabel: "Divide by 10 (Check Typo)",
    })
  }

  // 5. Phone format suggestion
  if (event.contact_phone) {
    const formatted = formatSriLankanPhone(event.contact_phone)
    if (formatted && formatted !== event.contact_phone.trim()) {
      suggestions.push({
        id: "format_sl_phone",
        field: "contact_phone",
        title: "Standardize Sri Lankan Phone Number",
        description: `Format contact number to official standard with international prefix (${formatted}).`,
        severity: "optimization",
        currentValue: event.contact_phone,
        suggestedValue: formatted,
        actionLabel: "Format Phone Number",
      })
    }
  }

  // 6. Category Smart Deduction (if category is generic or empty)
  const currentCat = (event.category || "").toLowerCase()
  if (!event.category || currentCat === "general" || currentCat === "community" || currentCat === "other") {
    const text = `${event.title} ${event.venue || ""}`.toLowerCase()
    let deducedCategory: string | null = null

    if (/\b(concert|music|band|live|acoustic|orchestra|dj|musical|singer|rock|edm)\b/i.test(text)) {
      deducedCategory = "Music"
    } else if (/\b(cricket|football|rugby|marathon|match|tournament|sports|badminton|run|cycle)\b/i.test(text)) {
      deducedCategory = "Sports"
    } else if (/\b(hackathon|tech|ai|coding|developer|web|software|startup|crypto)\b/i.test(text)) {
      deducedCategory = "Technology"
    } else if (/\b(exhibition|theatre|drama|art|cultural|paint|dance|ballet|photo)\b/i.test(text)) {
      deducedCategory = "Arts & Culture"
    } else if (/\b(food|dining|culinary|buffet|fest|beer|wine|coffee|bbq|cocktail)\b/i.test(text)) {
      deducedCategory = "Food & Dining"
    } else if (/\b(nightlife|party|club|rave|midnight|pub)\b/i.test(text)) {
      deducedCategory = "Nightlife"
    }

    if (deducedCategory && deducedCategory !== event.category) {
      suggestions.push({
        id: "smart_category",
        field: "category",
        title: "Smart Category Deduction",
        description: `Detected keywords related to '${deducedCategory}' from event details.`,
        severity: "optimization",
        currentValue: event.category || "None",
        suggestedValue: deducedCategory,
        actionLabel: `Set Category to '${deducedCategory}'`,
      })
    }
  }

  return suggestions
}
