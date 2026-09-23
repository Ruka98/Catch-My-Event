"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  MapPin,
  Check,
  Search,
  Sparkles,
  AlertTriangle,
  Compass,
  ArrowRight,
  ExternalLink,
} from "lucide-react"
import {
  LocationResolutionResult,
  resolveEventLocation,
  isWithinSriLanka,
  POPULAR_SRI_LANKA_VENUES,
  calculateDistanceKm,
} from "@/lib/admin/geocoding-resolver"
import DynamicLocationPicker from "@/components/dynamic-location-picker"
import { createClient } from "@/lib/supabase/client"

interface LocationResolverModalProps {
  isOpen: boolean
  onClose: () => void
  event: {
    id: string
    title: string
    venue: string | null
    location?: string | null
    latitude?: number | null
    longitude?: number | null
  } | null
  onLocationSaved: (
    eventId: string,
    updated: {
      latitude: number | null
      longitude: number | null
      venue: string
      location: string
    }
  ) => void
}

export function LocationResolverModal({
  isOpen,
  onClose,
  event,
  onLocationSaved,
}: LocationResolverModalProps) {
  const [resolution, setResolution] = useState<LocationResolutionResult | null>(null)
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [venueName, setVenueName] = useState("")
  const [cityName, setCityName] = useState("")
  const [customSearch, setCustomSearch] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{ name: string; lat: number; lng: number; city: string }>>([])
  const [isSearchingLocation, setIsSearchingLocation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (event) {
      const res = resolveEventLocation(
        event.venue,
        event.location,
        event.latitude,
        event.longitude
      )
      setResolution(res)
      setVenueName(event.venue || "")
      setCityName(event.location || "")

      if (event.latitude && event.longitude && isWithinSriLanka(event.latitude, event.longitude)) {
        setSelectedCoords({ lat: Number(event.latitude), lng: Number(event.longitude) })
      } else if (res.suggestedCandidates && res.suggestedCandidates.length > 0) {
        // Pre-select best candidate
        const first = res.suggestedCandidates[0]
        setSelectedCoords({ lat: first.lat, lng: first.lng })
        if (first.city && !event.location) {
          setCityName(first.city)
        }
      } else {
        setSelectedCoords({ lat: 6.9271, lng: 79.8612 }) // Default Colombo
      }
    }
  }, [event])

  const handleSelectCandidate = (candidate: { title: string; lat: number; lng: number; city?: string }) => {
    setSelectedCoords({ lat: candidate.lat, lng: candidate.lng })
    if (candidate.city) {
      setCityName(candidate.city)
    }
    if (!venueName || venueName.toLowerCase() === "tba") {
      setVenueName(candidate.title)
    }
  }

  const searchLocation = async (query: string) => {
    if (!query.trim()) return
    setIsSearchingLocation(true)
    try {
      const q = query.toLowerCase().includes("sri lanka") ? query : `${query}, Sri Lanka`

      // 1. Primary: Use Google Maps JavaScript Geocoder if loaded in window
      if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
        const geocoder = new (window as any).google.maps.Geocoder()
        geocoder.geocode({ address: q, componentRestrictions: { country: "LK" } }, (results: any, status: string) => {
          setIsSearchingLocation(false)
          if (status === "OK" && results) {
            const parsed = results
              .map((item: any) => ({
                name: item.formatted_address,
                lat: item.geometry?.location?.lat(),
                lng: item.geometry?.location?.lng(),
                city: item.address_components?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"))?.long_name || "Sri Lanka",
              }))
              .filter((item: any) => isWithinSriLanka(item.lat, item.lng))
            setSearchResults(parsed)
          } else {
            setSearchResults([])
          }
        })
        return
      }

      // 2. Secondary: Google Maps Geocoding API if key configured
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (apiKey) {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&components=country:LK&key=${apiKey}`
        )
        const data = await res.json()
        if (data.results && Array.isArray(data.results)) {
          const parsed = data.results
            .map((item: any) => ({
              name: item.formatted_address,
              lat: item.geometry?.location?.lat,
              lng: item.geometry?.location?.lng,
              city: item.address_components?.find((c: any) => c.types.includes("locality") || c.types.includes("administrative_area_level_2"))?.long_name || "Sri Lanka",
            }))
            .filter((item: any) => isWithinSriLanka(item.lat, item.lng))
          setSearchResults(parsed)
          return
        }
      }
    } catch (e) {
      console.warn("Google Location Search Error:", e)
    } finally {
      setIsSearchingLocation(false)
    }
  }

  const handleSave = async () => {
    if (!event || !selectedCoords) return
    setIsSaving(true)
    const supabase = createClient()
    try {
      const payload = {
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
        venue: venueName || event.venue || "Location Confirmed",
        location: cityName || venueName || "Colombo",
      }

      const { error } = await supabase.from("events").update(payload).eq("id", event.id)
      if (error) throw error

      onLocationSaved(event.id, payload)
      onClose()
    } catch (err: any) {
      alert("Failed to save location: " + (err.message || "Unknown error"))
    } finally {
      setIsSaving(false)
    }
  }

  if (!event) return null

  const isCurrentGpsValid = isWithinSriLanka(event.latitude, event.longitude)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Smart Location Resolver</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Automated geocoding cross-check & interactive location selector
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Current Event Context Banner */}
          <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900 text-sm truncate max-w-[400px]">
                {event.title}
              </span>
              {resolution?.tier === "tier_1_ok" ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                  Tier 1: Verified Location
                </Badge>
              ) : resolution?.tier === "tier_2_auto" ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Tier 2: Auto-Recognized
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Tier 3: Admin Selection Needed
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-slate-600 pt-1">
              <div>
                <span className="text-slate-400">Venue Text: </span>
                <span className="font-medium text-slate-800">{event.venue || "None / TBA"}</span>
              </div>
              <div>
                <span className="text-slate-400">Current GPS: </span>
                {isCurrentGpsValid ? (
                  <span className="font-mono text-emerald-700">
                    {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-rose-600 font-medium">Missing or Invalid</span>
                )}
              </div>
              {resolution?.distanceDeviationKm !== undefined && resolution.distanceDeviationKm > 15 && (
                <div className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Deviation: ~{resolution.distanceDeviationKm} km mismatch
                </div>
              )}
            </div>

            {resolution?.reason && (
              <p className="text-[11px] text-slate-500 italic mt-1 border-t border-slate-200/60 pt-1">
                {resolution.reason}
              </p>
            )}
          </div>

          {/* Suggested Landmark / Candidates */}
          {resolution?.suggestedCandidates && resolution.suggestedCandidates.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                Suggested Locations (Click to Snap Pin):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {resolution.suggestedCandidates.map((cand, idx) => {
                  const isSelected =
                    selectedCoords &&
                    Math.abs(selectedCoords.lat - cand.lat) < 0.001 &&
                    Math.abs(selectedCoords.lng - cand.lng) < 0.001

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectCandidate(cand)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-start justify-between ${
                        isSelected
                          ? "border-sky-500 bg-sky-50/70 text-sky-950 font-medium shadow-xs"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold truncate">{cand.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {cand.lat.toFixed(4)}, {cand.lng.toFixed(4)} {cand.city ? `(${cand.city})` : ""}
                        </div>
                        <span className="text-[10px] text-sky-600 font-medium">{cand.source}</span>
                      </div>
                      {isSelected ? (
                        <div className="h-5 w-5 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 text-slate-400">
                          <MapPin className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick Search for Venues / Landmarks */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Search Sri Lanka Places:</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="e.g. Lotus Tower, Nelum Pokuna, Kandy Lake..."
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocation(customSearch)}
                  className="pl-8 text-xs h-9 bg-white"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => searchLocation(customSearch)}
                disabled={isSearchingLocation || !customSearch.trim()}
                className="h-9 text-xs"
              >
                {isSearchingLocation ? "Searching..." : "Search Places"}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="p-2 border border-slate-200 rounded-lg bg-white space-y-1 text-xs">
                <p className="text-[11px] font-semibold text-slate-500 px-1">Search Results:</p>
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      handleSelectCandidate({
                        title: res.name.split(",")[0],
                        lat: res.lat,
                        lng: res.lng,
                        city: res.city,
                      })
                    }
                    className="w-full text-left p-1.5 rounded hover:bg-sky-50 text-slate-700 flex items-center justify-between transition-colors"
                  >
                    <span className="truncate pr-2">{res.name}</span>
                    <span className="text-sky-600 font-mono text-[10px] shrink-0">Snap Pin</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Preview & Pin Dropper */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-rose-500" />
                Interactive Map Pin (Click or Drag to adjust):
              </label>
              {selectedCoords && (
                <span className="font-mono text-[11px] text-slate-500">
                  {selectedCoords.lat.toFixed(5)}, {selectedCoords.lng.toFixed(5)}
                </span>
              )}
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <DynamicLocationPicker
                value={selectedCoords}
                onChange={(coords) => coords && setSelectedCoords(coords)}
                height="280px"
              />
            </div>
          </div>

          {/* Target Venue & City Name Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-medium text-slate-700">Display Venue Name:</label>
              <Input
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Nelum Pokuna Theatre"
                className="text-xs h-9 mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">City / District:</label>
              <Input
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="e.g. Colombo 07"
                className="text-xs h-9 mt-1"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !selectedCoords}
            className="bg-sky-600 hover:bg-sky-700 text-white"
          >
            {isSaving ? "Saving..." : "Save & Verify Location"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
