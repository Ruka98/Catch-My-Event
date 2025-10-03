"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  MapPin,
  Search,
  Grid3X3,
  Star,
  Clock,
  Heart,
  Users,
  Eye,
  MessageCircle,
  MessageSquare,
  Share2,
  Filter,
  Calendar,
  Plus,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-guard"
import { SocialTopNav } from "@/components/navigation/social-top-nav"
import { EventCard } from "@/components/EventCard"
import { useRouter } from "next/navigation"

// ✅ IMPORTANT: use the client-only helpers (no next/headers inside these)
import {
  getEventsClient,
  searchEventsClient,
  getUserRecommendationsClient,
  type EventWithProfile,
  type Recommendation,
} from "@/lib/supabase/events.client"
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
} from "date-fns"
import { mainCategories, getSubcategories } from "@/lib/constants/categories"

// Use local categories constants instead of fetching from database
const categories = ["All", ...mainCategories]

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedSubcategory, setSelectedSubcategory] = useState("All")
  const [subcategories, setSubcategories] = useState<string[]>(["All"])
  const [selectedLocation, setSelectedLocation] = useState("All")
  const [priceFilter, setPriceFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("this-month")
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [showRecommendedOnly, setShowRecommendedOnly] = useState(false)
  const [events, setEvents] = useState<EventWithProfile[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authLoading) return
    if (user) return
    if (typeof window === "undefined") return
    const hasSeenIntro = window.localStorage.getItem("catchMyEventIntroSeen")
    if (!hasSeenIntro) {
      router.replace("/welcome")
    }
  }, [authLoading, router, user])

  const locations = [
    "All",
    "Colombo",
    "Gampaha",
    "Kalutara",
    "Kandy",
    "Matale",
    "Nuwara Eliya",
    "Galle",
    "Matara",
    "Hambantota",
    "Jaffna",
    "Kilinochchi",
    "Mannar",
    "Vavuniya",
    "Mullaitivu",
    "Batticaloa",
    "Ampara",
    "Trincomalee",
    "Kurunegala",
    "Puttalam",
    "Anuradhapura",
    "Polonnaruwa",
    "Badulla",
    "Moneragala",
    "Ratnapura",
    "Kegalle",
  ]

  // Updated: Use local categories constants instead of fetching from database
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

  const loadEvents = useCallback(async () => {
    setIsLoading(true)
    try {
      let eventData: EventWithProfile[] = []

      if (searchTerm.trim()) {
        eventData = await searchEventsClient(searchTerm, user?.id)
      } else {
        eventData = await getEventsClient(user?.id ?? undefined)
      }

      setEvents(eventData)

      if (user && !showRecommendedOnly) {
        const recommendationData = await getUserRecommendationsClient(user.id)
        setRecommendations(recommendationData)
      }
    } catch (error) {
      console.error("Error loading events:", error)
    } finally {
      setIsLoading(false)
    }
  }, [searchTerm, user, showRecommendedOnly])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const getDisplayEvents = () => {
    if (showRecommendedOnly && user) {
      return recommendations.map((rec) => ({
        ...rec.events,
        recommendation_score: rec.score,
        recommendation_reason: rec.reason,
      })) as unknown as EventWithProfile[]
    }
    return events
  }

  const filteredEvents = getDisplayEvents().filter((event) => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      !term ||
      event.title.toLowerCase().includes(term) ||
      event.location.toLowerCase().includes(term) ||
      (event.description ?? "").toLowerCase().includes(term)

    const matchesCategory = selectedCategory === "All" || event.category === selectedCategory
    // @ts-ignore
    const matchesSubCategory = selectedSubcategory === "All" || event.subcategory === selectedSubcategory

    const matchesLocation = selectedLocation === "All" || event.location === selectedLocation

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && event.price === 0) ||
      (priceFilter === "1-1000" && (event.price ?? 0) > 0 && (event.price ?? 0) <= 1000) ||
      (priceFilter === "1001-2500" && (event.price ?? 0) > 1000 && (event.price ?? 0) <= 2500) ||
      (priceFilter === "2501-5000" && (event.price ?? 0) > 2500 && (event.price ?? 0) <= 5000) ||
      (priceFilter === "5001+" && (event.price ?? 0) > 5000)

    const eventDate = event.date ? parseISO(event.date) : null
    if (!eventDate) return false

    const today = new Date()
    const matchesDate = (() => {
      switch (dateFilter) {
        case "all":
          return true
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

    const matchesFeatured = !showFeaturedOnly || !!event.featured

    return (
      matchesSearch &&
      matchesCategory &&
      matchesSubCategory &&
      matchesLocation &&
      matchesPrice &&
      matchesDate &&
      matchesFeatured
    )
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <SocialTopNav active="feed" />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 space-y-6">
        <div className="pointer-events-auto mx-auto w-full max-w-2xl self-center rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                aria-hidden="true"
              />
              <Input
                type="text"
                placeholder="Search events, locations, etc."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 rounded-full border-2 border-sky-200 bg-white/95 pl-11 pr-4 text-sm shadow-inner focus:border-sky-500 focus:ring-sky-200"
                aria-label="Search events"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="h-11 rounded-full border-sky-200 bg-white/95 px-5"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 space-y-4 border-t border-sky-100 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="category-select" className="mb-1 block text-xs font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subcategory-select" className="mb-1 block text-xs font-medium text-gray-700">
                    Subcategory
                  </label>
                  <select
                    id="subcategory-select"
                    value={selectedSubcategory}
                    onChange={(e) => setSelectedSubcategory(e.target.value)}
                    className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    disabled={selectedCategory === "All"}
                  >
                    {subcategories.map((subcategory) => (
                      <option key={subcategory} value={subcategory}>
                        {subcategory}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="price-range-select" className="mb-1 block text-xs font-medium text-gray-700">
                    Ticket price
                  </label>
                  <select
                    id="price-range-select"
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="all">All prices</option>
                    <option value="free">Free</option>
                    <option value="1-1000">LKR 1 - 1000</option>
                    <option value="1001-2500">LKR 1001 - 2500</option>
                    <option value="2501-5000">LKR 2501 - 5000</option>
                    <option value="5001+">LKR 5001+</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="date-filter" className="mb-1 block text-xs font-medium text-gray-700">
                    Date
                  </label>
                  <select
                    id="date-filter"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="all">All Dates</option>
                    <option value="this-week">This Week</option>
                    <option value="next-week">Next Week</option>
                    <option value="this-month">This Month</option>
                    <option value="next-month">Next Month</option>
                    <option value="recent">Recent Events</option>
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-gray-700">Advanced</label>
                  <div className="flex flex-wrap gap-3 rounded-lg border border-dashed border-sky-200 bg-white/70 p-3 text-xs">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={showFeaturedOnly}
                        onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Star className="h-3 w-3 text-amber-500" aria-hidden="true" />
                      Featured events
                    </label>
                    {user && recommendations.length > 0 && (
                      <label className="flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={showRecommendedOnly}
                          onChange={(e) => setShowRecommendedOnly(e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <Heart className="h-3 w-3 text-rose-500" aria-hidden="true" />
                        Recommended for you
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Post Event Button */}
          <div className="mt-4 flex justify-center border-t border-sky-100 pt-4">
            <Button
              asChild
              className="rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2 text-white shadow-lg transition-all hover:from-sky-600 hover:to-blue-700 hover:shadow-xl"
            >
              <Link href="/post-event" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Post Event
              </Link>
            </Button>
          </div>
        </div>

        <section className="py-6">
          <div className="mx-auto max-w-2xl px-4">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {showRecommendedOnly
                    ? "Recommended for you"
                    : selectedLocation === "All"
                      ? "Events"
                      : `${selectedLocation} events`}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="rounded-full bg-white/80 px-3 py-1 font-medium shadow-sm">
                  {filteredEvents.length} events
                </span>
                {user && recommendations.length > 0 && (
                  <Badge variant="outline" className="border-red-200 bg-red-50 text-xs font-semibold text-red-700">
                    {recommendations.length} matches
                  </Badge>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden animate-pulse bg-white rounded-xl shadow-sm">
                    <div className="flex items-center p-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200" />
                      <div className="ml-3 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24" />
                        <div className="h-2 bg-gray-200 rounded w-16" />
                      </div>
                    </div>
                    <div className="w-full h-64 bg-gray-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    user={user}
                    onUpdate={loadEvents}
                  />
                ))}
              </div>
            )}

            {!isLoading && filteredEvents.length === 0 && (
              <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/60 py-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                  <Search className="h-8 w-8 text-sky-400" aria-hidden="true" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">No events found</h3>
                <p className="text-sm text-gray-600">
                  Try adjusting your filters or explore another day on the map or calendar.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="mt-10 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 py-10 text-white">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-sky-600 to-blue-500">
                <Calendar className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold">Catch My Event</h3>
            </div>
            <p className="text-sm text-gray-400">Your place to publish, discover, and catch every Sri Lankan event.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 text-sm sm:grid-cols-2 md:grid-cols-3">
            <div>
              <h4 className="mb-2 font-semibold">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/" className="transition hover:text-white">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/map" className="transition hover:text-white">
                    Explore map view
                  </Link>
                </li>
                <li>
                  <Link href="/calendar" className="transition hover:text-white">
                    My calendar
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="transition hover:text-white">
                    Browse categories
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Host &amp; Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/post-event" className="transition hover:text-white">
                    Host an event
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="transition hover:text-white">
                    Manage your events
                  </Link>
                </li>
                <li>
                  <a href="mailto:kavindurukmal@gmail.com" className="transition hover:text-white">
                    Feedback &amp; bug reports
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-semibold">Policies</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/privacy-policy" className="transition hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="transition hover:text-white">
                    Terms &amp; Conditions
                  </Link>
                </li>
                <li>
                  <Link href="/categories" className="transition hover:text-white">
                    Event submission guidelines
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-4 text-center text-xs text-gray-400">
            <p>&copy; {new Date().getFullYear()} Catch My Event. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
