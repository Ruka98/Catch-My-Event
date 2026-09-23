"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import DynamicLocationPicker from "@/components/dynamic-location-picker"
import {
  Search,
  Filter,
  Sparkles,
  Eye,
  Trash2,
  ExternalLink,
  Edit,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  MapPinOff,
  Navigation,
  User,
  Mail,
  Phone,
  Globe,
  Compass,
  Copy,
  AlertTriangle,
  Ban,
  Zap,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  resolveEventLocation,
  LocationResolutionResult,
  isWithinSriLanka,
} from "@/lib/admin/geocoding-resolver"
import {
  findSuspectDuplicates,
  auditEventSanity,
  generatePreEditSuggestions,
  DuplicateCluster,
  SanityIssue,
  EventAuditItem,
  PreEditSuggestion,
} from "@/lib/admin/quality-engine"
import { LocationResolverModal } from "@/components/admin/location-resolver-modal"
import { DuplicateMergeModal } from "@/components/admin/duplicate-merge-modal"
import { SuspendUserModal } from "@/components/admin/suspend-user-modal"

function formatUploadTime(dateStr: string | null | undefined) {
  if (!dateStr) return "Unknown"
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "Unknown"
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    )
  } catch {
    return dateStr
  }
}

function timeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    const diff = Math.floor((Date.now() - d.getTime()) / 1000)
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return ""
  } catch {
    return ""
  }
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventAuditItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [healthFilter, setHealthFilter] = useState<
    "all" | "auto_location" | "admin_location" | "mismatch_location" | "duplicates" | "sanity_issues" | "suspended_authors" | "suggestions"
  >("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "event_date_asc" | "event_date_desc" | "title_asc">("created_desc")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [batchResolving, setBatchResolving] = useState(false)

  // Quality & Intelligence Modals
  const [activeLocationEvent, setActiveLocationEvent] = useState<EventAuditItem | null>(null)
  const [activeDuplicateCluster, setActiveDuplicateCluster] = useState<DuplicateCluster | null>(null)
  const [activeSuspendUser, setActiveSuspendUser] = useState<{
    id: string
    display_name: string | null
    user_name: string | null
    events_count?: number
  } | null>(null)
  const [dismissedDuplicatePairs, setDismissedDuplicatePairs] = useState<Set<string>>(new Set())

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState<EventAuditItem | null>(null)
  const [editFormData, setEditFormData] = useState({
    title: "",
    category: "",
    date: "",
    end_date: "",
    time: "",
    venue: "",
    location: "",
    latitude: null as number | null,
    longitude: null as number | null,
    price: 0,
    image_url: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
    status: "published",
  })
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [appliedSuggestionIds, setAppliedSuggestionIds] = useState<Set<string>>(new Set())

  const openEditModal = (event: EventAuditItem) => {
    setEditingEvent(event)
    setAppliedSuggestionIds(new Set())
    setEditFormData({
      title: event.title || "",
      category: event.category || "Community",
      date: event.date || "",
      end_date: event.end_date || "",
      time: event.time || "",
      venue: event.venue || "",
      location: event.location || event.venue || "",
      latitude: event.latitude != null ? Number(event.latitude) : null,
      longitude: event.longitude != null ? Number(event.longitude) : null,
      price: event.price ?? 0,
      image_url: event.image_url || "",
      contact_email: event.contact_email || "",
      contact_phone: event.contact_phone || "",
      website_url: event.website_url || "",
      status: event.status || "published",
    })
  }

  const preEditSuggestions = useMemo(() => {
    if (!editingEvent) return []
    return generatePreEditSuggestions(editingEvent)
  }, [editingEvent])

  const handleApplySuggestion = (s: PreEditSuggestion) => {
    setEditFormData((prev) => {
      const updated = { ...prev }
      if (s.field === "title") updated.title = s.suggestedValue
      else if (s.field === "category") updated.category = s.suggestedValue
      else if (s.field === "price") updated.price = Number(s.suggestedValue)
      else if (s.field === "date") updated.date = s.suggestedValue
      else if (s.field === "end_date") updated.end_date = s.suggestedValue
      else if (s.field === "status") updated.status = s.suggestedValue
      else if (s.field === "contact_phone") updated.contact_phone = s.suggestedValue
      else if (s.field === "location" && s.meta) {
        if (s.meta.latitude != null) updated.latitude = s.meta.latitude
        if (s.meta.longitude != null) updated.longitude = s.meta.longitude
        if (s.meta.venue) updated.venue = s.meta.venue
        if (s.meta.location) updated.location = s.meta.location
      }
      return updated
    })
    setAppliedSuggestionIds((prev) => new Set([...Array.from(prev), s.id]))
  }

  const handleApplyAllSuggestions = () => {
    setEditFormData((prev) => {
      let updated = { ...prev }
      for (const s of preEditSuggestions) {
        if (s.field === "title") updated.title = s.suggestedValue
        else if (s.field === "category") updated.category = s.suggestedValue
        else if (s.field === "price") updated.price = Number(s.suggestedValue)
        else if (s.field === "date") updated.date = s.suggestedValue
        else if (s.field === "end_date") updated.end_date = s.suggestedValue
        else if (s.field === "status") updated.status = s.suggestedValue
        else if (s.field === "contact_phone") updated.contact_phone = s.suggestedValue
        else if (s.field === "location" && s.meta) {
          if (s.meta.latitude != null) updated.latitude = s.meta.latitude
          if (s.meta.longitude != null) updated.longitude = s.meta.longitude
          if (s.meta.venue) updated.venue = s.meta.venue
          if (s.meta.location) updated.location = s.meta.location
        }
      }
      return updated
    })
    setAppliedSuggestionIds(new Set(preEditSuggestions.map((s) => s.id)))
  }

  const handleSaveEdit = async () => {
    if (!editingEvent) return
    setIsSavingEdit(true)
    const supabase = createClient()
    try {
      const payload = {
        title: editFormData.title,
        category: editFormData.category,
        date: editFormData.date,
        end_date: editFormData.end_date || null,
        time: editFormData.time || null,
        venue: editFormData.venue,
        location: editFormData.location || editFormData.venue || "Colombo",
        latitude: editFormData.latitude != null ? Number(editFormData.latitude) : null,
        longitude: editFormData.longitude != null ? Number(editFormData.longitude) : null,
        price: Number(editFormData.price) || 0,
        image_url: editFormData.image_url || null,
        contact_email: editFormData.contact_email || null,
        contact_phone: editFormData.contact_phone || null,
        website_url: editFormData.website_url || null,
        status: editFormData.status,
      }

      const { error } = await supabase.from("events").update(payload).eq("id", editingEvent.id)
      if (error) throw error

      setEvents((prev) =>
        prev.map((e) =>
          e.id === editingEvent.id
            ? {
                ...e,
                ...payload,
              }
            : e
        )
      )
      setEditingEvent(null)
    } catch (err) {
      console.error("Error updating event:", err)
      alert("Failed to update event. Please try again.")
    } finally {
      setIsSavingEdit(false)
    }
  }

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          category,
          date,
          end_date,
          time,
          venue,
          location,
          latitude,
          longitude,
          price,
          image_url,
          is_featured,
          status,
          views,
          created_at,
          user_id,
          profile_id,
          contact_email,
          contact_phone,
          website_url,
          profiles:user_id (
            id,
            display_name,
            user_name,
            avatar_url,
            is_suspended,
            suspension_reason
          ),
          event_attendees (count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const normalized = (data || []).map((e: any) => ({
        ...e,
        attendees_count: Array.isArray(e.event_attendees) && e.event_attendees.length > 0 ? e.event_attendees[0].count : 0,
      }))

      setEvents(normalized)
    } catch (err) {
      console.error("Failed to load events:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Quality Intelligence Memos
  const locationResolutions = useMemo(() => {
    const map = new Map<string, LocationResolutionResult>()
    events.forEach((e) => {
      map.set(e.id, resolveEventLocation(e.venue, e.location, e.latitude, e.longitude))
    })
    return map
  }, [events])

  const duplicateClusters = useMemo(() => {
    const clusters = findSuspectDuplicates(events)
    return clusters.filter((c) => {
      const key = [c.primaryEvent.id, c.duplicateEvent.id].sort().join("::")
      return !dismissedDuplicatePairs.has(key)
    })
  }, [events, dismissedDuplicatePairs])

  const duplicateEventIdMap = useMemo(() => {
    const map = new Map<string, DuplicateCluster>()
    duplicateClusters.forEach((c) => {
      map.set(c.primaryEvent.id, c)
      map.set(c.duplicateEvent.id, c)
    })
    return map
  }, [duplicateClusters])

  const sanityIssuesMap = useMemo(() => {
    const map = new Map<string, SanityIssue[]>()
    events.forEach((e) => {
      const issues = auditEventSanity(e)
      if (issues.length > 0) map.set(e.id, issues)
    })
    return map
  }, [events])

  // Quality Issue Counters
  const autoLocationCount = useMemo(() => {
    let count = 0
    events.forEach((e) => {
      if (locationResolutions.get(e.id)?.tier === "tier_2_auto") count++
    })
    return count
  }, [events, locationResolutions])

  const adminLocationCount = useMemo(() => {
    let count = 0
    events.forEach((e) => {
      const res = locationResolutions.get(e.id)
      if (res?.tier === "tier_3_admin" && (res.distanceDeviationKm == null || res.distanceDeviationKm <= 15)) {
        count++
      }
    })
    return count
  }, [events, locationResolutions])

  const mismatchCount = useMemo(() => {
    let count = 0
    events.forEach((e) => {
      const res = locationResolutions.get(e.id)
      if (res?.distanceDeviationKm !== undefined && res.distanceDeviationKm > 15) {
        count++
      }
    })
    return count
  }, [events, locationResolutions])

  const sanityCount = sanityIssuesMap.size
  const suspendedAuthorCount = useMemo(() => {
    return events.filter((e) => e.profiles?.is_suspended).length
  }, [events])

  const suggestionsMap = useMemo(() => {
    const map = new Map<string, PreEditSuggestion[]>()
    events.forEach((e) => {
      const suggestions = generatePreEditSuggestions(e)
      if (suggestions.length > 0) map.set(e.id, suggestions)
    })
    return map
  }, [events])

  const suggestionsCount = suggestionsMap.size

  // Batch Auto-Apply All High-Confidence Locations
  const handleBatchAutoApplyLocations = async () => {
    const autoCandidates = events.filter((e) => locationResolutions.get(e.id)?.tier === "tier_2_auto")
    if (autoCandidates.length === 0) return

    if (
      !confirm(
        `⚡ Auto-Apply Geocoding: Do you want to automatically set GPS coordinates and city for all ${autoCandidates.length} recognized venues?`
      )
    ) {
      return
    }

    setBatchResolving(true)
    const supabase = createClient()
    let successCount = 0

    try {
      for (const e of autoCandidates) {
        const res = locationResolutions.get(e.id)
        if (res?.suggestedCandidates && res.suggestedCandidates.length > 0) {
          const best = res.suggestedCandidates[0]
          const payload = {
            latitude: best.lat,
            longitude: best.lng,
            location: best.city || e.location || "Colombo",
          }
          const { error } = await supabase.from("events").update(payload).eq("id", e.id)
          if (!error) {
            successCount++
            setEvents((prev) =>
              prev.map((item) => (item.id === e.id ? { ...item, ...payload } : item))
            )
          }
        }
      }
      alert(`Successfully auto-geocoded ${successCount} events!`)
    } catch (err: any) {
      alert("Batch geocoding error: " + err.message)
    } finally {
      setBatchResolving(false)
    }
  }

  // Location Saved Callback from LocationResolverModal
  const handleLocationSaved = (
    eventId: string,
    updated: { latitude: number | null; longitude: number | null; venue: string; location: string }
  ) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, ...updated } : e))
    )
  }

  // Duplicate Merge Callback
  const handleMergeComplete = (primaryId: string, removedId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === removedId ? { ...e, status: "hidden" } : e))
    )
  }

  // Toggle Featured status
  const toggleFeatured = async (id: string, current: boolean | undefined) => {
    setActionLoadingId(id)
    const supabase = createClient()
    try {
      const next = !current
      const { error } = await supabase.from("events").update({ is_featured: next }).eq("id", id)
      if (!error) {
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, is_featured: next } : e)))
      }
    } catch (err) {
      console.error("Error updating featured status:", err)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Toggle Published vs Hidden status
  const toggleStatus = async (id: string, currentStatus: string | undefined) => {
    setActionLoadingId(id)
    const supabase = createClient()
    try {
      const next = currentStatus === "hidden" ? "published" : "hidden"
      const { error } = await supabase.from("events").update({ status: next }).eq("id", id)
      if (!error) {
        setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status: next } : e)))
      }
    } catch (err) {
      console.error("Error updating status:", err)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Delete event
  const deleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return
    setActionLoadingId(id)
    const supabase = createClient()
    try {
      const { error } = await supabase.from("events").delete().eq("id", id)
      if (!error) {
        setEvents((prev) => prev.filter((e) => e.id !== id))
      }
    } catch (err) {
      console.error("Error deleting event:", err)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Filtered and Sorted events
  const filteredEvents = useMemo(() => {
    const list = events.filter((event) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        searchQuery === "" ||
        event.title?.toLowerCase().includes(q) ||
        event.venue?.toLowerCase().includes(q) ||
        event.category?.toLowerCase().includes(q) ||
        event.profiles?.display_name?.toLowerCase().includes(q) ||
        event.profiles?.user_name?.toLowerCase().includes(q) ||
        event.contact_email?.toLowerCase().includes(q) ||
        event.website_url?.toLowerCase().includes(q)

      const matchesCategory =
        selectedCategory === "all" || event.category === selectedCategory

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "featured" && event.is_featured) ||
        (statusFilter === "published" && event.status !== "hidden") ||
        (statusFilter === "hidden" && event.status === "hidden")

      // Health Filter checks
      let matchesHealth = true
      const res = locationResolutions.get(event.id)

      if (healthFilter === "auto_location") {
        matchesHealth = res?.tier === "tier_2_auto"
      } else if (healthFilter === "admin_location") {
        matchesHealth = res?.tier === "tier_3_admin" && (res.distanceDeviationKm == null || res.distanceDeviationKm <= 15)
      } else if (healthFilter === "mismatch_location") {
        matchesHealth = Boolean(res?.distanceDeviationKm && res.distanceDeviationKm > 15)
      } else if (healthFilter === "duplicates") {
        matchesHealth = duplicateEventIdMap.has(event.id)
      } else if (healthFilter === "sanity_issues") {
        matchesHealth = sanityIssuesMap.has(event.id)
      } else if (healthFilter === "suspended_authors") {
        matchesHealth = Boolean(event.profiles?.is_suspended)
      } else if (healthFilter === "suggestions") {
        matchesHealth = suggestionsMap.has(event.id)
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesHealth
    })

    return list.sort((a, b) => {
      if (sortBy === "created_desc") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeB - timeA
      }
      if (sortBy === "created_asc") {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
        return timeA - timeB
      }
      if (sortBy === "event_date_asc") {
        return (a.date || "").localeCompare(b.date || "")
      }
      if (sortBy === "event_date_desc") {
        return (b.date || "").localeCompare(a.date || "")
      }
      if (sortBy === "title_asc") {
        return (a.title || "").localeCompare(b.title || "")
      }
      return 0
    })
  }, [
    events,
    searchQuery,
    selectedCategory,
    statusFilter,
    healthFilter,
    sortBy,
    locationResolutions,
    duplicateEventIdMap,
    sanityIssuesMap,
    suggestionsMap,
  ])

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => {
      if (e.category) set.add(e.category)
    })
    return Array.from(set)
  }, [events])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Moderation & Quality Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated location verification, duplicate handling, sanity heuristics, and anti-spam moderation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {autoLocationCount > 0 && (
            <Button
              onClick={handleBatchAutoApplyLocations}
              disabled={batchResolving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-xs"
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              {batchResolving ? "Resolving..." : `Auto-Apply All (${autoLocationCount}) GPS`}
            </Button>
          )}
          <Link href="/post-event">
            <Button className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm text-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Add Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Health Intelligence Summary Bar (3-Tier & Quality Filter Pills) */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Quality Health:</span>

        <button
          onClick={() => setHealthFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            healthFilter === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          All ({events.length})
        </button>

        <button
          onClick={() => setHealthFilter("auto_location")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            healthFilter === "auto_location"
              ? "bg-blue-600 text-white shadow-xs"
              : autoLocationCount > 0
              ? "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>⚡ Auto-Resolvable GPS ({autoLocationCount})</span>
        </button>

        <button
          onClick={() => setHealthFilter("admin_location")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            healthFilter === "admin_location"
              ? "bg-amber-600 text-white shadow-xs"
              : adminLocationCount > 0
              ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          <span>🧭 Needs Admin GPS ({adminLocationCount})</span>
        </button>

        <button
          onClick={() => setHealthFilter("mismatch_location")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            healthFilter === "mismatch_location"
              ? "bg-rose-600 text-white shadow-xs"
              : mismatchCount > 0
              ? "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>⚠️ Location Mismatch ({mismatchCount})</span>
        </button>

        <button
          onClick={() => setHealthFilter("duplicates")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            healthFilter === "duplicates"
              ? "bg-purple-600 text-white shadow-xs"
              : duplicateClusters.length > 0
              ? "bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Copy className="h-3.5 w-3.5" />
          <span>👯 Suspect Duplicates ({duplicateClusters.length})</span>
        </button>

        <button
          onClick={() => setHealthFilter("sanity_issues")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            healthFilter === "sanity_issues"
              ? "bg-orange-600 text-white shadow-xs"
              : sanityCount > 0
              ? "bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>🚩 Sanity Issues ({sanityCount})</span>
        </button>

        <button
          onClick={() => setHealthFilter("suggestions")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
            healthFilter === "suggestions"
              ? "bg-sky-600 text-white shadow-xs"
              : suggestionsCount > 0
              ? "bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>💡 Pre-Edit Improvements ({suggestionsCount})</span>
        </button>

        {suspendedAuthorCount > 0 && (
          <button
            onClick={() => setHealthFilter("suspended_authors")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              healthFilter === "suspended_authors"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            <Ban className="h-3.5 w-3.5" />
            <span>🚫 Suspended Authors ({suspendedAuthorCount})</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by title, location, organizer, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="featured">Featured Only</SelectItem>
                <SelectItem value="published">Published Only</SelectItem>
                <SelectItem value="hidden">Hidden / Suspended</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort by Upload Time / Date */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="w-[190px] border-sky-200 bg-sky-50/30 text-sky-900 font-medium">
                <div className="flex items-center gap-1.5 text-xs truncate">
                  <ArrowUpDown className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                  <SelectValue placeholder="Sort order" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">🕒 Upload: Newest First</SelectItem>
                <SelectItem value="created_asc">🕒 Upload: Oldest First</SelectItem>
                <SelectItem value="event_date_asc">📅 Event Date: Soonest</SelectItem>
                <SelectItem value="event_date_desc">📅 Event Date: Latest</SelectItem>
                <SelectItem value="title_asc">🔤 Title: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Showing {filteredEvents.length} of {events.length} total events</span>
          {(searchQuery || selectedCategory !== "all" || statusFilter !== "all" || healthFilter !== "all" || sortBy !== "created_desc") && (
            <button
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
                setStatusFilter("all")
                setHealthFilter("all")
                setSortBy("created_desc")
              }}
              className="text-sky-600 hover:underline font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Events Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto mb-2" />
            Loading events & running quality checks...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No events match your current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 min-w-[280px]">Event & Quality Status</th>
                  <th className="px-4 py-3 min-w-[180px]">Location Intelligence</th>
                  <th className="px-4 py-3 min-w-[170px]">Uploaded By</th>
                  <th
                    className="px-4 py-3 min-w-[140px] cursor-pointer select-none hover:text-sky-700 transition-colors"
                    onClick={() => setSortBy((prev) => (prev === "created_desc" ? "created_asc" : "created_desc"))}
                    title="Click to toggle upload time sorting (Newest / Oldest)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Uploaded At</span>
                      {sortBy === "created_desc" ? (
                        <ArrowDown className="h-3.5 w-3.5 text-sky-600" />
                      ) : sortBy === "created_asc" ? (
                        <ArrowUp className="h-3.5 w-3.5 text-sky-600" />
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 min-w-[130px]">Event Date</th>
                  <th className="px-4 py-3 min-w-[110px]">Category & Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event) => {
                  const locRes = locationResolutions.get(event.id)
                  const dupCluster = duplicateEventIdMap.get(event.id)
                  const sanityIssues = sanityIssuesMap.get(event.id)
                  const eventSuggestions = suggestionsMap.get(event.id) || []

                  return (
                    <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Event & Quality Status */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={event.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&auto=format&fit=crop&q=80"}
                            alt={event.title}
                            className="h-12 w-12 rounded-lg object-cover bg-slate-100 shrink-0 shadow-xs mt-0.5"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-semibold text-slate-900 truncate max-w-[220px]" title={event.title}>
                                {event.title}
                              </p>
                              {event.is_featured && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                  Featured
                                </span>
                              )}
                            </div>

                            {/* Duplicate, Sanity, and Pre-Edit Badges */}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {dupCluster && (
                                <button
                                  type="button"
                                  onClick={() => setActiveDuplicateCluster(dupCluster)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-200 hover:bg-purple-200 transition-colors cursor-pointer"
                                  title="Suspect duplicate found. Click to inspect & merge."
                                >
                                  <Copy className="h-2.5 w-2.5" />
                                  Duplicate ({dupCluster.similarityScore}%)
                                </button>
                              )}

                              {sanityIssues && sanityIssues.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-900 border border-orange-200"
                                  title={sanityIssues.map((s) => s.message).join("\n")}
                                >
                                  <AlertTriangle className="h-2.5 w-2.5 text-orange-700" />
                                  {sanityIssues[0].message.slice(0, 26)}...
                                </span>
                              )}

                              {eventSuggestions.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openEditModal(event)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors cursor-pointer"
                                  title={`${eventSuggestions.length} quality improvements suggested before editing. Click to view.`}
                                >
                                  <Sparkles className="h-2.5 w-2.5 text-sky-600" />
                                  {eventSuggestions.length} tips
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3-Tier Location Intelligence Column */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-800 truncate max-w-[170px]" title={event.venue || ""}>
                            {event.venue || "No location specified"}
                          </p>

                          {/* 3-Tier Badges */}
                          {locRes?.distanceDeviationKm !== undefined && locRes.distanceDeviationKm > 15 ? (
                            <button
                              type="button"
                              onClick={() => setActiveLocationEvent(event)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                              title={`Stored coordinates conflict with venue text by ~${locRes.distanceDeviationKm} km. Click to resolve.`}
                            >
                              <AlertTriangle className="h-2.5 w-2.5 text-rose-600" />
                              Mismatch (~{locRes.distanceDeviationKm} km)
                            </button>
                          ) : locRes?.tier === "tier_1_ok" ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                              title={`GPS Verified: ${event.latitude?.toFixed(4)}, ${event.longitude?.toFixed(4)}`}
                            >
                              <MapPin className="h-2.5 w-2.5 text-emerald-600" />
                              Tier 1: Verified GPS
                            </span>
                          ) : locRes?.tier === "tier_2_auto" ? (
                            <button
                              type="button"
                              onClick={() => setActiveLocationEvent(event)}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              title={locRes.reason}
                            >
                              <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                              Tier 2: Auto-Resolvable
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setActiveLocationEvent(event)}
                              className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                              title="Ambiguous or missing venue. Click for Admin selection."
                            >
                              <Compass className="h-2.5 w-2.5 text-amber-600" />
                              Tier 3: Needs Admin Pin
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Uploaded By */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {event.profiles?.avatar_url ? (
                            <img
                              src={event.profiles.avatar_url}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs border border-sky-200 shrink-0">
                              {(event.profiles?.display_name || event.profiles?.user_name || (event.user_id ? "U" : "S")).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1">
                              <p className="font-medium text-slate-900 text-xs truncate max-w-[120px]">
                                {event.profiles?.display_name || event.profiles?.user_name || (event.user_id ? "Registered User" : "Scraper / Anon")}
                              </p>
                              {event.profiles?.is_suspended && (
                                <span className="inline-flex items-center px-1 rounded text-[9px] font-semibold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                  Suspended
                                </span>
                              )}
                            </div>
                            {event.profiles?.user_name ? (
                              <p className="text-[11px] text-slate-400 truncate max-w-[120px]">
                                @{event.profiles.user_name}
                              </p>
                            ) : event.website_url ? (
                              <a
                                href={event.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-sky-600 hover:underline flex items-center gap-0.5 font-medium"
                                title={event.website_url}
                              >
                                Source Link <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Anonymous</span>
                            )}
                          </div>

                          {/* Quick Suspend Author Action */}
                          {event.user_id && !event.profiles?.is_suspended && (
                            <button
                              type="button"
                              onClick={() =>
                                setActiveSuspendUser({
                                  id: event.user_id!,
                                  display_name: event.profiles?.display_name || null,
                                  user_name: event.profiles?.user_name || null,
                                  events_count: 1,
                                })
                              }
                              title="Suspend author account & hide submissions"
                              className="p-1 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Uploaded At */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {timeAgo(event.created_at) || "Recent"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono mt-0.5" title={event.created_at || ""}>
                            {formatUploadTime(event.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Event Date */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <p className="font-medium text-slate-800">
                          {event.date}
                          {event.end_date && event.end_date !== event.date ? ` – ${event.end_date}` : ""}
                        </p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{event.time || "Time TBA"}</p>
                      </td>

                      {/* Category & Price */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-xs font-normal">
                          {event.category || "General"}
                        </Badge>
                        {event.price !== null && event.price !== undefined && (
                          <p className="text-[11px] text-slate-500 mt-1">
                            {event.price === 0 ? "Free" : `LKR ${event.price.toLocaleString()}`}
                          </p>
                        )}
                      </td>

                      {/* Status & Featured */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => toggleStatus(event.id, event.status)}
                          disabled={actionLoadingId === event.id}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                            event.status === "hidden"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {event.status === "hidden" ? (
                            <>
                              <XCircle className="h-3 w-3" /> Hidden
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3" /> Published
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Resolve Location Icon Button */}
                          <button
                            type="button"
                            onClick={() => setActiveLocationEvent(event)}
                            title="Open Location Resolver"
                            className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          >
                            <Compass className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => toggleFeatured(event.id, event.is_featured)}
                            disabled={actionLoadingId === event.id}
                            title={event.is_featured ? "Unfeature event" : "Feature on home"}
                            className={`p-1.5 rounded-md transition-colors ${
                              event.is_featured
                                ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                                : "text-slate-300 hover:text-amber-500 hover:bg-slate-100"
                            }`}
                          >
                            <Sparkles className="h-4 w-4 fill-current" />
                          </button>

                          <Link href={`/events/${event.id}`} target="_blank">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-sky-600" title="View live">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(event)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-sky-600 cursor-pointer"
                            title="Edit event details"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={actionLoadingId === event.id}
                            onClick={() => deleteEvent(event.id)}
                            className="h-8 w-8 p-0 text-slate-500 hover:text-red-600 cursor-pointer"
                            title="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Location Resolver Modal (3-Tier & Confused Handler) */}
      <LocationResolverModal
        isOpen={Boolean(activeLocationEvent)}
        onClose={() => setActiveLocationEvent(null)}
        event={activeLocationEvent}
        onLocationSaved={handleLocationSaved}
      />

      {/* Duplicate Merge Modal */}
      <DuplicateMergeModal
        isOpen={Boolean(activeDuplicateCluster)}
        onClose={() => setActiveDuplicateCluster(null)}
        cluster={activeDuplicateCluster}
        onMergeComplete={handleMergeComplete}
        onDismissDuplicate={(pairKey) =>
          setDismissedDuplicatePairs((prev) => new Set([...Array.from(prev), pairKey]))
        }
      />

      {/* Suspend User Modal */}
      <SuspendUserModal
        isOpen={Boolean(activeSuspendUser)}
        onClose={() => setActiveSuspendUser(null)}
        user={activeSuspendUser}
        onSuspended={(userId) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.user_id === userId
                ? {
                    ...e,
                    status: "hidden",
                    profiles: e.profiles ? { ...e.profiles, is_suspended: true } : e.profiles,
                  }
                : e
            )
          )
        }}
      />

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Event & Verification</h2>
                <p className="text-xs text-slate-500">Check organizer authenticity, verify dates & source, or update location</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Pre-Edit Quality Improvement Assistant */}
              {preEditSuggestions.length > 0 && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/60 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-sky-950">
                            Pre-Edit Quality & Optimization Assistant
                          </h3>
                          <Badge className="bg-sky-200 text-sky-900 border-sky-300 text-[10px] font-semibold">
                            {preEditSuggestions.length - appliedSuggestionIds.size} Pending
                          </Badge>
                        </div>
                        <p className="text-[11px] text-sky-700 mt-0.5">
                          Review recommended fixes before editing or apply them in 1-click.
                        </p>
                      </div>
                    </div>

                    <div>
                      {appliedSuggestionIds.size < preEditSuggestions.length ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplyAllSuggestions}
                          className="bg-sky-600 hover:bg-sky-700 text-white text-xs h-7 px-3 shadow-xs font-semibold"
                        >
                          <Zap className="h-3 w-3 mr-1" />
                          Auto-Apply All Suggestions
                        </Button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-md">
                          <Check className="h-3.5 w-3.5" /> All Suggestions Applied
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {preEditSuggestions.map((s) => {
                      const isApplied = appliedSuggestionIds.has(s.id)
                      return (
                        <div
                          key={s.id}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 transition-all ${
                            isApplied
                              ? "bg-white/80 border-emerald-300 text-slate-700"
                              : s.severity === "critical"
                              ? "bg-white border-rose-300 shadow-xs"
                              : s.severity === "warning"
                              ? "bg-white border-amber-300 shadow-xs"
                              : "bg-white border-sky-200 shadow-xs"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                                  isApplied
                                    ? "bg-emerald-500"
                                    : s.severity === "critical"
                                    ? "bg-rose-500"
                                    : s.severity === "warning"
                                    ? "bg-amber-500"
                                    : "bg-sky-500"
                                }`}
                              />
                              <span className="font-semibold text-slate-900">{s.title}</span>
                              <Badge
                                variant="outline"
                                className="text-[9px] uppercase px-1.5 py-0 font-mono text-slate-500 bg-slate-50"
                              >
                                {s.field}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-600 pl-4">{s.description}</p>
                          </div>

                          {isApplied ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold shrink-0 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Check className="h-3 w-3" /> Applied
                            </span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleApplySuggestion(s)}
                              className="h-7 text-xs border-sky-300 text-sky-700 hover:bg-sky-50 hover:text-sky-800 shrink-0 font-medium"
                            >
                              {s.actionLabel}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Uploader & Verification Audit Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-sky-600" />
                    Uploader & Verification Info
                  </span>
                  {editingEvent.created_at && (
                    <span className="text-[11px] text-slate-500 font-mono">
                      Uploaded: {formatUploadTime(editingEvent.created_at)} ({timeAgo(editingEvent.created_at)})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-0.5">
                  {editingEvent.profiles?.avatar_url ? (
                    <img
                      src={editingEvent.profiles.avatar_url}
                      alt="Uploader"
                      className="h-10 w-10 rounded-full object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-sm border border-sky-200">
                      {(editingEvent.profiles?.display_name || editingEvent.profiles?.user_name || (editingEvent.user_id ? "U" : "S")).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 text-xs">
                      {editingEvent.profiles?.display_name || editingEvent.profiles?.user_name || (editingEvent.user_id ? "Registered User" : "System / Scraped Source")}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {editingEvent.profiles?.user_name
                        ? `@${editingEvent.profiles.user_name}`
                        : editingEvent.user_id
                        ? `User ID: ${editingEvent.user_id.slice(0, 12)}...`
                        : "Anonymous / Automated Scraper"}
                    </p>
                  </div>
                </div>

                {/* Contact & Source verification fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Contact Email</label>
                    <Input
                      value={editFormData.contact_email}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_email: e.target.value })}
                      placeholder="organizer@email.com"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Contact Phone</label>
                    <Input
                      value={editFormData.contact_phone}
                      onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                      placeholder="+94 77 123 4567"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-0.5 flex items-center justify-between">
                      <span>Source Website</span>
                      {editFormData.website_url && (
                        <a
                          href={editFormData.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:underline flex items-center gap-0.5 text-[10px] font-semibold"
                        >
                          Verify Link <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </label>
                    <Input
                      value={editFormData.website_url}
                      onChange={(e) => setEditFormData({ ...editFormData, website_url: e.target.value })}
                      placeholder="https://mytickets.lk/..."
                      className="h-8 text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <Input
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    placeholder="e.g. Music, Community, Nightlife"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ticket Price (LKR)</label>
                  <Input
                    type="number"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                    placeholder="0 for Free"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <Input
                    type="date"
                    value={editFormData.date}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                  <Input
                    value={editFormData.time}
                    onChange={(e) => setEditFormData({ ...editFormData, time: e.target.value })}
                    placeholder="e.g. 07:00 PM"
                  />
                </div>
              </div>

              {/* Location & Map Section */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 text-sky-600" />
                    <span>Venue & Map Location</span>
                  </div>
                  {editFormData.latitude != null && editFormData.longitude != null ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      GPS: {editFormData.latitude.toFixed(4)}, {editFormData.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      ⚠️ No map coordinates
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Venue Name</label>
                    <Input
                      value={editFormData.venue}
                      onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                      placeholder="e.g. Nelum Pokuna, Colombo"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City / Area</label>
                    <Input
                      value={editFormData.location}
                      onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                      placeholder="e.g. Colombo 07"
                    />
                  </div>
                </div>

                {/* Latitude & Longitude Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Latitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={editFormData.latitude ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value)
                        setEditFormData({ ...editFormData, latitude: isNaN(val as number) ? null : val })
                      }}
                      placeholder="e.g. 6.9123"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Longitude</label>
                    <Input
                      type="number"
                      step="any"
                      value={editFormData.longitude ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value)
                        setEditFormData({ ...editFormData, longitude: isNaN(val as number) ? null : val })
                      }}
                      placeholder="e.g. 79.8654"
                    />
                  </div>
                </div>

                {/* Map Picker */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Click anywhere on the map to pin exact location:
                  </label>
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <DynamicLocationPicker
                      value={
                        editFormData.latitude != null && editFormData.longitude != null
                          ? { lat: editFormData.latitude, lng: editFormData.longitude }
                          : null
                      }
                      onChange={(coords) => {
                        if (coords) {
                          setEditFormData({
                            ...editFormData,
                            latitude: coords.lat,
                            longitude: coords.lng,
                          })
                        }
                      }}
                      height="220px"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="hidden">Hidden / Suspended</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setEditingEvent(null)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-sky-600 hover:bg-sky-700 text-white font-medium"
              >
                {isSavingEdit ? "Saving Changes..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
