"use client"

import { useState, useCallback } from "react"
import { EventCard } from "@/components/EventCard"
import type { EventWithProfile } from "@/lib/supabase/types"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"

type ProfileEventsProps = {
  initialEvents: EventWithProfile[]
  profileId: string
  user: User | null
}

export function ProfileEvents({ initialEvents, profileId, user }: ProfileEventsProps) {
  const [events, setEvents] = useState(initialEvents)
  const [loading, setLoading] = useState(false)

  const loadProfileEvents = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
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
      .eq("created_by", profileId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to reload user events:", error)
    } else {
      setEvents((data as EventWithProfile[]) || [])
    }
    setLoading(false)
  }, [profileId])

  if (events.length === 0) {
    return (
      <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/70">
        <h3 className="text-lg font-medium text-gray-800">No events posted yet.</h3>
        <p className="mt-2 text-sm text-gray-500">
          This user hasn&apos;t posted any events. Check back later!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          user={user}
          onUpdate={loadProfileEvents}
        />
      ))}
    </div>
  )
}