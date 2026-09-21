"use client"
import { createBrowserClient } from "@supabase/ssr"
import {
  eventSelectWithAttendance,
  eventSelectWithProfiles,
  isMissingAttendanceRelation,
  isMissingProfilesRelation,
  plainEventSelect,
} from "./eventSelect"
import { hydrateAttendanceForEvents } from "./attendanceHydrator"
import type { EventAttendee, EventWithProfile, Recommendation } from "./types"

function supabase() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

async function hydrateProfiles(
  client: ReturnType<typeof supabase>,
  events: EventWithProfile[],
): Promise<EventWithProfile[]> {
  if (events.length === 0) return events

  const userIds = [
    ...new Set(events.map((event) => event.user_id).filter((id): id is string => !!id)),
  ]
  if (userIds.length === 0) return events

  const { data: profiles, error } = await client
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds)

  if (error) {
    console.warn("Failed to hydrate profiles, leaving them as-is.", error)
    return events
  }

  const profilesById = new Map(profiles.map((p) => [p.id, p]))

  return events.map((event) => {
    if (!event.user_id) return event
    const profile = profilesById.get(event.user_id)
    if (!profile) return event

    return {
      ...event,
      profiles: {
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      },
    }
  })
}

const publishedFilter = { column: "status", value: "published" } as const

async function attachUserAttendance(
  client: ReturnType<typeof supabase>,
  events: EventWithProfile[],
  userId: string,
  force = false,
): Promise<EventWithProfile[]> {
  if (!userId || events.length === 0) return events

  const needsUserAttendance =
    force ||
    events.some(
      (event) => !(Array.isArray(event.event_attendees) && event.event_attendees.some((att) => att.user_id === userId)),
    )

  if (!needsUserAttendance) {
    return events
  }

  const eventIds = events.map((event) => event.id).filter(Boolean)
  if (eventIds.length === 0) return events

  const { data, error } = await client
    .from("event_attendees")
    .select("id, event_id, user_id, status, created_at, profiles:profiles(display_name, avatar_url)")
    .eq("user_id", userId)
    .in("event_id", eventIds)

  if (error) {
    if (!isMissingAttendanceRelation(error)) {
      console.warn("Failed to load user attendance", error)
    }
    return events
  }

  const attendeesByEvent = new Map<string, EventAttendee[]>()
  for (const attendee of data ?? []) {
    if (!attendee.event_id) continue
    const list = attendeesByEvent.get(attendee.event_id) ?? []
    list.push(attendee as EventAttendee)
    attendeesByEvent.set(attendee.event_id, list)
  }

  return events.map((event) => {
    const existing = Array.isArray(event.event_attendees) ? event.event_attendees : []
    const filtered = existing.filter((attendee) => attendee.user_id !== userId)
    const merged = attendeesByEvent.get(event.id) ?? []
    return {
      ...event,
      event_attendees: filtered.length > 0 || merged.length > 0 ? [...filtered, ...merged] : event.event_attendees,
    }
  })
}

async function fetchEventsWithFallback(buildQuery: (select: string) => any) {
  let fallbackUsed = false
  let select = eventSelectWithAttendance

  while (true) {
    const { data, error } = await buildQuery(select)

    if (!error) {
      return { events: (data ?? []) as EventWithProfile[], fallbackUsed }
    }

    if (select === eventSelectWithAttendance && isMissingAttendanceRelation(error)) {
      fallbackUsed = true
      select = eventSelectWithProfiles
      continue
    }

    if (
      (select === eventSelectWithAttendance || select === eventSelectWithProfiles) &&
      isMissingProfilesRelation(error)
    ) {
      fallbackUsed = true
      select = plainEventSelect
      continue
    }

    throw error
  }
}

export async function getEventsClient(userId?: string): Promise<EventWithProfile[]> {
  const s = supabase()
  const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
    s
      .from("events")
      .select(select)
      .eq(publishedFilter.column, publishedFilter.value)
      .order("created_at", { ascending: false }),
  )

  const withProfiles = await hydrateProfiles(s, events)
  const hydrated = await hydrateAttendanceForEvents(s as any, withProfiles, { fallbackUsed })

  if (userId) {
    const withAttendance = await attachUserAttendance(s, hydrated, userId, fallbackUsed)
    return attachUserLikes(s, withAttendance, userId)
  }

  return hydrated
}

export async function getEventsForUserClient(userId: string): Promise<EventWithProfile[]> {
  const s = supabase()
  const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
    s.from("events").select(select).eq("user_id", userId).order("created_at", { ascending: false }),
  )
  const withProfiles = await hydrateProfiles(s, events)
  return hydrateAttendanceForEvents(s as any, withProfiles, { fallbackUsed })
}

async function attachUserLikes(
  client: ReturnType<typeof supabase>,
  events: EventWithProfile[],
  userId: string,
): Promise<EventWithProfile[]> {
  if (!userId || events.length === 0) return events

  const eventIds = events.map((event) => event.id).filter(Boolean)
  if (eventIds.length === 0) return events

  const { data, error } = await client.from("likes").select("event_id").eq("user_id", userId).in("event_id", eventIds)

  if (error) {
    console.warn("Failed to load user likes", error)
    return events
  }

  const likedEventIds = new Set(data.map((like) => like.event_id))

  return events.map((event) => ({
    ...event,
    user_has_liked: likedEventIds.has(event.id),
  }))
}

export async function searchEventsClient(q: string, userId?: string): Promise<EventWithProfile[]> {
  const s = supabase()
  const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
    s
      .from("events")
      .select(select)
      .eq(publishedFilter.column, publishedFilter.value)
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%,venue.ilike.%${q}%`)
      .order("created_at", { ascending: false }),
  )
  const withProfiles = await hydrateProfiles(s, events)
  const hydrated = await hydrateAttendanceForEvents(s as any, withProfiles, { fallbackUsed })

  if (userId) {
    const withAttendance = await attachUserAttendance(s, hydrated, userId, fallbackUsed)
    return attachUserLikes(s, withAttendance, userId)
  }

  return hydrated
}

export async function getEventByIdClient(id: string): Promise<EventWithProfile | null> {
  const s = supabase()
  const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
    s.from("events").select(select).eq("id", id).limit(1),
  )

  const withProfiles = await hydrateProfiles(s, events)
  const hydrated = await hydrateAttendanceForEvents(s as any, withProfiles, { fallbackUsed })
  return hydrated[0] ?? null
}

export async function updateEventClient(id: string, updates: Partial<EventWithProfile>): Promise<void> {
  const s = supabase()
  const { error } = await s
    .from("events")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function getUserRecommendationsClient(userId: string): Promise<Recommendation[]> {
  const s = supabase()
  // adjust to your schema / RPC
  const { data, error } = await s
    .from("recommendations")
    .select("score, reason, events:events(*)")
    .eq("user_id", userId)
    .order("score", { ascending: false })
  if (error) return []
  return (data ?? []) as Recommendation[]
}

export async function updateEventViews(eventId: string) {
  const s = supabase()
  const { error } = await s.rpc("increment_event_views", { event_id: eventId })
  if (error) throw error
}

export async function toggleEventAttendance(eventId: string, userId: string, action: "attending") {
  const s = supabase()
  const { data: existing, error: fetchError } = await s
    .from("event_attendees")
    .select("id, status")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError
  }

  const isCurrentlyAttending = existing?.status === "attending";

  if (isCurrentlyAttending) {
    // If the user is currently attending, remove them.
    if (existing?.id) {
      const { error: deleteError } = await s.from("event_attendees").delete().eq("id", existing.id);
      if (deleteError) throw deleteError;
    }
  } else {
    // If the user is not currently attending, add them.
    const { error } = await s.from("event_attendees").upsert(
      {
        event_id: eventId,
        user_id: userId,
        status: "attending",
      },
      { onConflict: "event_id,user_id" },
    );
    if (error) throw error;
  }
}

export async function toggleEventLike(eventId: string, userId: string) {
  const s = supabase()
  const { data: existing, error: fetchError } = await s
    .from("likes")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle()

  if (fetchError && fetchError.code !== "PGRST116") {
    throw fetchError
  }

  if (existing) {
    const { error: deleteError } = await s.from("likes").delete().eq("id", existing.id)
    if (deleteError) throw deleteError
  } else {
    const { error } = await s.from("likes").insert({ event_id: eventId, user_id: userId })
    if (error) throw error
  }
}

export async function deleteEventClient(eventId: string): Promise<void> {
  const s = supabase()
  const { error } = await s
    .from("events")
    .delete()
    .eq("id", eventId)
  if (error) throw error
}
