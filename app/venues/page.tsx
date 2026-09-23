"use client"

import React, { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Building2,
  Film,
  MapPin,
  Search,
  Compass,
  ArrowRight,
  Navigation,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import {
  extractPlacesFromEvents,
  calculateDistanceKm,
  formatDistance,
  EventVenueItem,
} from "@/lib/venues/venue-helper"

export default function VenuesDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Get user geolocation for real-time rough distance
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => {
          // Location access not available
        }
      )
    }
  }, [])

  // Fetch published events from database to discover active places
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from("events")
          .select(`
            id,
            title,
            category,
            venue,
            location,
            latitude,
            longitude,
            image_url,
            status
          `)
          .eq("status", "published")

        if (!error && data) {
          setEvents(data)
        }
      } catch (err) {
        console.error("Error fetching places events:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // Purely dynamic places strictly extracted from database events
  const allPlaces = useMemo(() => {
    return extractPlacesFromEvents(events, userLocation)
  }, [events, userLocation])

  // Dynamically extract categories that actually exist across the database places
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    allPlaces.forEach((p) => {
      p.categories?.forEach((cat) => {
        if (cat && cat.trim()) set.add(cat.trim())
      })
    })
    return Array.from(set).sort()
  }, [allPlaces])

  const filteredPlaces = useMemo(() => {
    return allPlaces.filter((v) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        q === "" ||
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q)

      const matchesCategory =
        selectedCategory === "all" ||
        (v.categories && v.categories.includes(selectedCategory))

      return matchesSearch && matchesCategory
    })
  }, [allPlaces, searchQuery, selectedCategory])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 pb-16">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Top Header Card */}
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-900 via-slate-900 to-sky-950 text-white p-6 sm:p-10 shadow-xl">
          <div className="max-w-2xl mx-auto text-center space-y-3.5">
            <Badge className="bg-sky-500/20 text-sky-200 border border-sky-400/30 text-xs font-semibold px-3 py-1">
              <MapPin className="h-3 w-3 mr-1 text-sky-400" /> Event Places &amp; Locations
            </Badge>

            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Explore Places
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
              Find out what&apos;s happening across Sri Lanka&apos;s leading convention centres, event grounds, and local venues.
            </p>

            {/* Search Bar */}
            <div className="relative pt-2 max-w-lg mx-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search places by name or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white text-gray-900 text-sm rounded-full shadow-md border-0 focus-visible:ring-2 focus-visible:ring-sky-400"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Category Filter Tabs based on actual database data */}
        <div className="flex items-center gap-1.5 p-1 bg-white border border-sky-100 rounded-2xl shadow-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === "all"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
            }`}
          >
            All Places ({allPlaces.length})
          </button>

          {availableCategories.map((cat) => {
            const count = allPlaces.filter((p) => p.categories && p.categories.includes(cat)).length
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-sky-600 text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-sky-50"
                }`}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>

        {/* Venues Grid */}
        {loading ? (
          <div className="py-20 text-center text-sm text-gray-500">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto mb-2" />
            Loading places...
          </div>
        ) : filteredPlaces.length === 0 ? (
          <Card className="py-16 text-center bg-white rounded-3xl border border-dashed border-sky-200 p-6 space-y-3">
            <MapPin className="h-10 w-10 text-sky-300 mx-auto" />
            <h3 className="font-bold text-gray-800 text-base">
              {searchQuery ? `No places match "${searchQuery}"` : "No places found"}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery
                ? "Try searching for a different place or city name."
                : "Places will appear here automatically when events are published."}
            </p>
            {(searchQuery || selectedCategory !== "all") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setSelectedCategory("all")
                }}
                className="rounded-xl border-sky-200 text-sky-700 hover:bg-sky-50 text-xs"
              >
                Reset Filters
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredPlaces.map((venue) => (
              <Link
                key={venue.slug}
                href={`/venues/${venue.slug}`}
                className="group bg-white rounded-3xl border border-sky-100/90 hover:border-sky-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Photo Thumbnail */}
                <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={venue.image_url}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=800&auto=format&fit=crop&q=80"
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  {/* Type Badge */}
                  <Badge className="absolute top-3 left-3 bg-white/95 text-gray-900 text-[10px] font-bold border-0 shadow-sm">
                    <span>{venue.typeLabel}</span>
                  </Badge>

                  {/* Active event count tag */}
                  {venue.eventCount > 0 && (
                    <span className="absolute top-3 right-3 bg-sky-600/90 backdrop-blur text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                      {venue.eventCount} {venue.eventCount === 1 ? "event" : "events"}
                    </span>
                  )}

                  {/* City & Distance */}
                  <div className="absolute bottom-3 left-3 right-3 text-white flex items-center justify-between text-[11px]">
                    <span className="text-sky-300 flex items-center gap-1 font-medium truncate">
                      <MapPin className="h-3 w-3 shrink-0" /> {venue.city}, Sri Lanka
                    </span>

                    {venue.distanceKm != null && (
                      <span className="shrink-0 flex items-center gap-1 text-emerald-300 font-semibold bg-black/50 px-2 py-0.5 rounded-full backdrop-blur">
                        <Navigation className="h-2.5 w-2.5 text-emerald-400" />
                        {formatDistance(venue.distanceKm)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-gray-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                      {venue.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {venue.address}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-sky-100 flex items-center justify-between text-xs font-semibold text-sky-600">
                    <span>View Events &amp; Schedule</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
