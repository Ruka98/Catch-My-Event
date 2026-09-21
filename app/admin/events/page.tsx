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
  Globe
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

interface EventItem {
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
  profile_id?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  website_url?: string | null
  profiles?: {
    id?: string
    display_name: string | null
    user_name: string | null
    avatar_url: string | null
  } | null
  attendees_count?: number
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"created_desc" | "created_asc" | "event_date_asc" | "event_date_desc" | "title_asc">("created_desc")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Edit Event Modal State
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
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

  const openEditModal = (event: EventItem) => {
    setEditingEvent(event)
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

  const handleLocationChange = async (coords: { lat: number; lng: number } | null) => {
    if (!coords) {
      setEditFormData((prev) => ({ ...prev, latitude: null, longitude: null }))
      return
    }
    const newLat = Number(coords.lat.toFixed(6))
    const newLng = Number(coords.lng.toFixed(6))
    setEditFormData((prev) => ({
      ...prev,
      latitude: newLat,
      longitude: newLng,
    }))

    // Reverse geocode to suggest venue name or area if venue is missing
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}`,
        { headers: { "User-Agent": "CatchMyEventAdmin/1.0" } }
      )
      const data = await response.json()
      if (data && data.display_name) {
        setEditFormData((prev) => ({
          ...prev,
          location:
            data.address?.city ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.county ||
            prev.location ||
            "Colombo",
          venue: prev.venue && prev.venue !== "Location TBA" ? prev.venue : data.display_name,
        }))
      }
    } catch (e) {
      console.warn("Reverse geocode warning:", e)
    }
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
            avatar_url
          ),
          event_attendees (count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const normalized = (data || []).map((e: any) => ({
        ...e,
        attendees_count: Array.isArray(e.event_attendees) && e.event_attendees.length > 0 ? e.event_attendees[0].count : 0
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

      return matchesSearch && matchesCategory && matchesStatus
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
  }, [events, searchQuery, selectedCategory, statusFilter, sortBy])

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Moderation & Verification</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review event submissions, verify organizers, update details, or remove events across Catch My Event.
          </p>
        </div>
        <Link href="/post-event">
          <Button className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Event
          </Button>
        </Link>
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
          {(searchQuery || selectedCategory !== "all" || statusFilter !== "all" || sortBy !== "created_desc") && (
            <button
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
                setStatusFilter("all")
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
            Loading events...
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
                  <th className="px-4 py-3 min-w-[250px]">Event & Venue</th>
                  <th className="px-4 py-3 min-w-[170px]">Uploaded By</th>
                  <th
                    className="px-4 py-3 min-w-[150px] cursor-pointer select-none hover:text-sky-700 transition-colors"
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
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Event & Venue */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={event.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&auto=format&fit=crop&q=80"}
                          alt={event.title}
                          className="h-12 w-12 rounded-lg object-cover bg-slate-100 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 truncate max-w-[220px]" title={event.title}>
                              {event.title}
                            </p>
                            {event.is_featured && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Featured
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-slate-500 truncate max-w-[180px]" title={event.venue || ""}>
                              {event.venue || "No location specified"}
                            </span>
                            {event.latitude != null && event.longitude != null ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0"
                                title={`GPS: ${event.latitude}, ${event.longitude}`}
                              >
                                <MapPin className="h-2.5 w-2.5 text-emerald-600" />
                                Pin
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 shrink-0"
                                title="No GPS coordinates. Edit to pin on map."
                              >
                                No Pin
                              </span>
                            )}
                          </div>
                        </div>
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
                          <p className="font-medium text-slate-900 text-xs truncate max-w-[130px]">
                            {event.profiles?.display_name || event.profiles?.user_name || (event.user_id ? "Registered User" : "Scraper / Anon")}
                          </p>
                          {event.profiles?.user_name ? (
                            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">
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
                          title="Edit event"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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

                {/* Interactive Map Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      Search or Click Map to Select Location
                    </label>
                    {editFormData.latitude != null && editFormData.longitude != null && (
                      <button
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, latitude: null, longitude: null })}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Clear GPS Pin
                      </button>
                    )}
                  </div>
                  <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <DynamicLocationPicker
                      value={
                        editFormData.latitude != null && editFormData.longitude != null
                          ? { lat: editFormData.latitude, lng: editFormData.longitude }
                          : null
                      }
                      onChange={handleLocationChange}
                      height="280px"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Use the search bar inside the map or click anywhere to reposition the pin. Dragging the pin updates coordinates automatically.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Poster Image URL</label>
                <Input
                  value={editFormData.image_url}
                  onChange={(e) => setEditFormData({ ...editFormData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="published">Published (Visible to all)</option>
                  <option value="hidden">Hidden / Suspended</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button variant="outline" onClick={() => setEditingEvent(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-sky-600 hover:bg-sky-700 text-white"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

