"use client"

import React, { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  Calendar,
  Users,
  Star,
  Eye,
  TrendingUp,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AdminStats {
  totalEvents: number
  featuredEvents: number
  totalUsers: number
  totalAttendees: number
  totalLikes: number
}

interface RecentEvent {
  id: string
  title: string
  category: string | null
  date: string | null
  end_date?: string | null
  venue: string | null
  image_url: string | null
  is_featured?: boolean
  status?: string
  views?: number
  profiles?: {
    display_name: string | null
    user_name: string | null
    avatar_url: string | null
  } | null
}

interface RecentUser {
  id: string
  display_name: string | null
  user_name: string | null
  avatar_url: string | null
  is_admin?: boolean
  created_at: string | null
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalEvents: 0,
    featuredEvents: 0,
    totalUsers: 0,
    totalAttendees: 0,
    totalLikes: 0,
  })
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // 1. Fetch event count
      const { count: eventsCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })

      // 2. Fetch featured events count
      const { count: featuredCount } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("is_featured", true)

      // 3. Fetch user count
      const { count: usersCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })

      // 4. Fetch attendees count
      const { count: attendeesCount } = await supabase
        .from("event_attendees")
        .select("*", { count: "exact", head: true })

      // 5. Fetch likes count
      const { count: likesCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })

      setStats({
        totalEvents: eventsCount || 0,
        featuredEvents: featuredCount || 0,
        totalUsers: usersCount || 0,
        totalAttendees: attendeesCount || 0,
        totalLikes: likesCount || 0,
      })

      // 6. Fetch recent events
      const { data: eventsData } = await supabase
        .from("events")
        .select(`
          id,
          title,
          category,
          date,
          end_date,
          venue,
          image_url,
          is_featured,
          status,
          views,
          profiles:user_id (
            display_name,
            user_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false })
        .limit(6)

      if (eventsData) {
        setRecentEvents(eventsData as any)
      }

      // 7. Fetch recent users
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, display_name, user_name, avatar_url, is_admin, created_at")
        .order("created_at", { ascending: false })
        .limit(5)

      if (usersData) {
        setRecentUsers(usersData as any)
      }
    } catch (err) {
      console.error("Error loading admin stats:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const toggleFeatured = async (eventId: string, currentStatus: boolean | undefined) => {
    setActionLoadingId(eventId)
    const supabase = createClient()
    try {
      const nextStatus = !currentStatus
      const { error } = await supabase
        .from("events")
        .update({ is_featured: nextStatus })
        .eq("id", eventId)

      if (!error) {
        setRecentEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, is_featured: nextStatus } : e))
        )
        setStats((prev) => ({
          ...prev,
          featuredEvents: nextStatus ? prev.featuredEvents + 1 : Math.max(0, prev.featuredEvents - 1),
        }))
      }
    } catch (err) {
      console.error("Failed to toggle featured event:", err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event as an Admin? This action cannot be undone.")) {
      return
    }

    setActionLoadingId(eventId)
    const supabase = createClient()
    try {
      const { error } = await supabase.from("events").delete().eq("id", eventId)
      if (!error) {
        setRecentEvents((prev) => prev.filter((e) => e.id !== eventId))
        setStats((prev) => ({ ...prev, totalEvents: Math.max(0, prev.totalEvents - 1) }))
      }
    } catch (err) {
      console.error("Failed to delete event:", err)
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Admin Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time platform metrics, moderation, and system management.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/post-event">
            <Button className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Post New Event
            </Button>
          </Link>
          <Button variant="outline" onClick={loadDashboardData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Events</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalEvents}</div>
            <p className="text-xs text-slate-500 mt-1">
              <span className="font-semibold text-amber-600">{stats.featuredEvents}</span> featured on homepage
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Platform Users</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalUsers}</div>
            <p className="text-xs text-slate-500 mt-1">Active organizers & event attendees</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total RSVPs</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalAttendees}</div>
            <p className="text-xs text-slate-500 mt-1">Confirmed going & interested guests</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Total Likes</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalLikes}</div>
            <p className="text-xs text-slate-500 mt-1">Community event favorites</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Recent Events & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Events Table (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Recent Events</h2>
              <Badge variant="secondary" className="font-semibold text-xs">
                Latest {recentEvents.length}
              </Badge>
            </div>
            <Link href="/admin/events" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              View All Events &rarr;
            </Link>
          </div>

          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            {recentEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                No events found. Start by posting your first event!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Event</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Featured</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentEvents.map((event) => (
                      <tr key={event.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={event.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=100&auto=format&fit=crop&q=80"}
                              alt={event.title}
                              className="h-10 w-10 rounded-lg object-cover bg-slate-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                                {event.title}
                              </p>
                              <p className="text-xs text-slate-500 truncate max-w-[180px]">
                                {event.venue || "Venue TBA"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-normal">
                            {event.category || "General"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                          {event.date || "TBA"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleFeatured(event.id, event.is_featured)}
                            disabled={actionLoadingId === event.id}
                            className={`p-1 rounded-md transition-colors ${
                              event.is_featured
                                ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                                : "text-slate-300 hover:text-amber-500 hover:bg-slate-100"
                            }`}
                            title={event.is_featured ? "Featured on Home" : "Click to Feature"}
                          >
                            <Sparkles className="h-4 w-4 fill-current" />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link href={`/events/${event.id}`} target="_blank">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-sky-600">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={actionLoadingId === event.id}
                              onClick={() => deleteEvent(event.id)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                              title="Delete Event"
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
        </div>

        {/* Users Column (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Recent Users</h2>
            </div>
            <Link href="/admin/users" className="text-xs font-semibold text-sky-600 hover:text-sky-700">
              Manage Users &rarr;
            </Link>
          </div>

          <Card className="border-slate-200 shadow-sm bg-white p-4 divide-y divide-slate-100">
            {recentUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500">
                No users found.
              </div>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-bold">
                        {(u.display_name || u.user_name || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {u.display_name || u.user_name || "Anonymous User"}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {u.user_name ? `@${u.user_name}` : "Member"}
                      </p>
                    </div>
                  </div>
                  {u.is_admin && (
                    <Badge className="bg-sky-500/10 text-sky-700 border-sky-200 text-[10px] font-semibold">
                      Admin
                    </Badge>
                  )}
                </div>
              ))
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
