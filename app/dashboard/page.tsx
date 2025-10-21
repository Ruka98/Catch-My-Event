"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Plus, Eye } from "lucide-react"
import { EventCard } from "@/components/EventCard"
import type { EventWithProfile } from "@/lib/supabase/types"

export default function DashboardPage() {
  const { user } = useAuth()
  const [userEvents, setUserEvents] = useState<EventWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserEvents = useCallback(async () => {
    if (!user?.id) {
      setUserEvents([])
      setLoading(false)
      return
    }

    setLoading(true)
    const s = createClient()

    // We need to fetch events with their profile data to match the type expected by EventCard
    const { data, error } = await s
      .from("events")
      .select(`
        *,
        like_count,
        comments(count),
        profiles (
          display_name,
          avatar_url,
          reputation_score
        ),
        event_attendees (
          id,
          event_id,
          user_id,
          status
        )
      `)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to load user events:", error)
      setUserEvents([])
    } else {
      setUserEvents((data as EventWithProfile[]) || [])
    }

    setLoading(false)
  }, [user?.id])


  useEffect(() => {
    loadUserEvents()
  }, [loadUserEvents])

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
        <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Sign in to manage your events</h1>
          <p className="max-w-2xl text-sm text-gray-600">
            Create an account or log in to access your dashboard, track attendance, and keep tabs on your community
            impact.
          </p>
          <Link href="/auth/login">
            <Button className="bg-sky-600 hover:bg-sky-700 text-white">Sign in</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6">
        <section className="space-y-6 rounded-3xl border border-sky-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                {user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}&apos;s Profile
              </h1>
              <p className="text-sm text-gray-600 sm:text-base">
                Manage your events and view your public profile.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="sm" className="bg-sky-600 text-white hover:bg-sky-700">
                <Link href="/post-event" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create event
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="bg-transparent">
                <Link href={`/profile/${user.id}`} className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  View Public Profile
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Events You&apos;ve Posted</h2>
          </div>

          {loading ? (
            <div className="text-center text-gray-500">Loading your events...</div>
          ) : userEvents.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  user={user}
                  onUpdate={loadUserEvents}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/70">
              <h3 className="text-lg font-medium text-gray-800">You haven&apos;t posted any events yet.</h3>
              <p className="mt-2 text-sm text-gray-500">Ready to get started? Create your first event now.</p>
              <Button asChild className="mt-4 bg-sky-600 hover:bg-sky-700">
                <Link href="/post-event">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Link>
              </Button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}