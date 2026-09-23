"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import {
  Building2,
  Film,
  MapPin,
  Search,
  Navigation,
  Compass,
  ArrowRight,
  Filter,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { POPULAR_VENUES, VenueInfo } from "@/lib/venues/venue-helper"

export default function VenuesDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedType, setSelectedType] = useState<string>("all")

  const filteredVenues = useMemo(() => {
    return POPULAR_VENUES.filter((v) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        q === "" ||
        v.name.toLowerCase().includes(q) ||
        v.city.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        v.aliases.some((a) => a.toLowerCase().includes(q))

      const matchesType =
        selectedType === "all" ||
        (selectedType === "cinema" && v.isCinema) ||
        (selectedType === "auditorium" && (v.type === "auditorium" || v.type === "theatre")) ||
        (selectedType === "stadium" && v.type === "stadium") ||
        (selectedType === "hotel" && v.type === "hotel") ||
        (selectedType === "park" && v.type === "park")

      return matchesSearch && matchesType
    })
  }, [searchQuery, selectedType])

  const cinemaCount = POPULAR_VENUES.filter((v) => v.isCinema).length
  const theatreCount = POPULAR_VENUES.filter((v) => v.type === "auditorium" || v.type === "theatre").length
  const stadiumCount = POPULAR_VENUES.filter((v) => v.type === "stadium").length

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white py-12 sm:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <Badge className="bg-sky-500/20 text-sky-300 border border-sky-400/30 text-xs font-semibold px-3 py-1">
            📍 Places & Movie Theaters
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Explore Venues & Live Schedules
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto">
            Check what is happening today, tomorrow, and this weekend at Sri Lanka&apos;s leading movie theatres, auditoriums, and stadiums.
          </p>

          {/* Search Input */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by venue or cinema (e.g. BMICH, Scope Cinemas, Savoy, Nelum Pokuna)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white text-slate-900 text-sm rounded-xl shadow-lg border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-5 relative z-20 space-y-6">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 p-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-x-auto">
          <button
            onClick={() => setSelectedType("all")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              selectedType === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            All Venues ({POPULAR_VENUES.length})
          </button>

          <button
            onClick={() => setSelectedType("cinema")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedType === "cinema"
                ? "bg-sky-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Film className="h-3.5 w-3.5" />
            <span>Cinemas & Theaters ({cinemaCount})</span>
          </button>

          <button
            onClick={() => setSelectedType("auditorium")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedType === "auditorium"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Auditoriums & Halls ({theatreCount})</span>
          </button>

          <button
            onClick={() => setSelectedType("stadium")}
            className={`py-2 px-4 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              selectedType === "stadium"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Stadiums & Grounds ({stadiumCount})</span>
          </button>
        </div>

        {/* Venues Grid */}
        {filteredVenues.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
            <p className="font-bold text-slate-800">No venues match your search &quot;{searchQuery}&quot;</p>
            <p className="text-xs text-slate-500">Try searching for BMICH, Nelum Pokuna, Savoy, or Scope Cinemas.</p>
            <Button size="sm" variant="outline" onClick={() => { setSearchQuery(""); setSelectedType("all"); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVenues.map((venue) => (
              <Link
                key={venue.slug}
                href={`/venues/${venue.slug}`}
                className="group bg-white rounded-2xl border border-slate-200/90 hover:border-sky-300 hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                {/* Image Cover */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  <img
                    src={venue.image_url}
                    alt={venue.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

                  <Badge className="absolute top-3 left-3 bg-white/90 text-slate-900 text-[10px] font-bold border-0 shadow-sm backdrop-blur-xs">
                    {venue.isCinema ? (
                      <span className="flex items-center gap-1 text-sky-700">
                        <Film className="h-3 w-3" /> {venue.typeLabel}
                      </span>
                    ) : (
                      <span>{venue.typeLabel}</span>
                    )}
                  </Badge>

                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[11px] text-sky-300 flex items-center gap-1 font-medium">
                      <MapPin className="h-3 w-3" /> {venue.city}, Sri Lanka
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                      {venue.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">{venue.description || venue.address}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-sky-600">
                    <span>View Today &amp; Upcoming Schedule</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
