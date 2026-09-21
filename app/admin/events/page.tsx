"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
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
  CheckCircle2,
  XCircle,
  Clock
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

interface EventItem {
  id: string
  title: string
  category: string | null
  date: string | null
  end_date?: string | null
  time?: string | null
  venue: string | null
  price?: number | null
  image_url: string | null
  is_featured?: boolean
  status?: string
  views?: number
  created_at: string | null
  profiles?: {
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
    price: 0,
    image_url: "",
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
      price: event.price ?? 0,
      image_url: event.image_url || "",
      status: event.status || "published",
    })
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
        location: editFormData.venue || "Colombo",
        price: Number(editFormData.price) || 0,
        image_url: editFormData.image_url || null,
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
          price,
          image_url,
          is_featured,
          status,
          views,
          created_at,
          profiles:user_id (
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

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        searchQuery === "" ||
        event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        selectedCategory === "all" || event.category === selectedCategory

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "featured" && event.is_featured) ||
        (statusFilter === "published" && event.status !== "hidden") ||
        (statusFilter === "hidden" && event.status === "hidden")

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [events, searchQuery, selectedCategory, statusFilter])

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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Moderation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage, feature, review, or remove events across the entire Catch My Event network.
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
              placeholder="Search by title, location, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/50"
            />
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
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

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="featured">Featured Only</SelectItem>
                <SelectItem value="published">Published Only</SelectItem>
                <SelectItem value="hidden">Hidden / Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>Showing {filteredEvents.length} of {events.length} total events</span>
          {(searchQuery || selectedCategory !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("")
                setSelectedCategory("all")
                setStatusFilter("all")
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
                  <th className="px-4 py-3">Event Details</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Engagement</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Event Details */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={event.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&auto=format&fit=crop&q=80"}
                          alt={event.title}
                          className="h-12 w-12 rounded-lg object-cover bg-slate-100 shrink-0 shadow-xs"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 truncate max-w-[220px]">
                              {event.title}
                            </p>
                            {event.is_featured && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                                Featured
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate max-w-[220px]">
                            {event.venue || "No location specified"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            By {event.profiles?.display_name || event.profiles?.user_name || "Organizer"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <p className="font-medium text-slate-800">
                        {event.date}
                        {event.end_date && event.end_date !== event.date ? ` – ${event.end_date}` : ""}
                      </p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{event.time || "Time TBA"}</p>
                    </td>

                    {/* Category */}
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

                    {/* Engagement */}
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      <p className="font-medium text-slate-700">
                        {event.attendees_count || 0} RSVPs
                      </p>
                      <p className="text-slate-400 text-[11px]">{event.views || 0} views</p>
                    </td>

                    {/* Status & Featured */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-start">
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
                      </div>
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
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-900">Edit Event</h2>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <Input
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Event title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <Input
                    value={editFormData.category}
                    onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                    placeholder="e.g. Music, Community"
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

              <div className="grid grid-cols-2 gap-3">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Venue / Location</label>
                <Input
                  value={editFormData.venue}
                  onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                  placeholder="e.g. Nelum Pokuna, Colombo"
                />
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

