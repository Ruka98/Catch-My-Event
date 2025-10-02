import * as React from "react";
import type { EventRow } from "@/lib/supabase/types"; // 

export interface Event {
  id: string
  title: string
  description: string
  date: string
  time: string
  venue: string
  location: string
  address?: string
  city?: string
  category: string
  price: number
  max_attendees?: number
  image_url?: string
  website_url?: string
  contact_email?: string
  contact_phone?: string
  latitude?: number
  longitude?: number
  status: "draft" | "published" | "cancelled" | "completed"
  featured: boolean
  views: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface EventWithProfile extends Event {
  profiles: {
    display_name: string
    avatar_url?: string
    reputation_score: number
  }
  attendee_count?: number
  user_attending?: boolean
  average_rating?: number
}

export interface Recommendation {
  id: string
  event_id: string
  score: number
  reason: string
  created_at: string
  events: Event
}

// Server-side functions
export async function getPublishedEvents(): Promise<EventWithProfile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      profiles!events_user_id_fkey (
        display_name,
        avatar_url,
        reputation_score
      )
    `)
    .eq("status", "published")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data || []
}

export async function getEventsByCategory(category: string): Promise<EventWithProfile[]> {
  const supabase = await createClient()

  const query = supabase
    .from("events")
    .select(`
      *,
      profiles!events_user_id_fkey (
        display_name,
        avatar_url,
        reputation_score
      )
    `)
    .eq("status", "published")
    .gte("date", new Date().toISOString().split("T")[0])

  if (category !== "All") {
    query.eq("category", category)
  }

  const { data, error } = await query.order("date", { ascending: true })

  if (error) {
    console.error("Error fetching events by category:", error)
    return []
  }

  return data || []
}

export async function getUserRecommendations(userId: string): Promise<Recommendation[]> {
  const supabase = await createClient()

  // First, calculate recommendations for the user
  await supabase.rpc("calculate_recommendations", { target_user_id: userId })

  // Then fetch the recommendations
  const { data, error } = await supabase
    .from("event_recommendations")
    .select(`
      *,
      events (
        *,
        profiles!events_user_id_fkey (
          display_name,
          avatar_url,
          reputation_score
        )
      )
    `)
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching recommendations:", error)
    return []
  }

  return data || []
}

// Client-side functions
export async function getEventsClient(): Promise<EventWithProfile[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      profiles!events_user_id_fkey (
        display_name,
        avatar_url,
        reputation_score
      )
    `)
    .eq("status", "published")
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true })

  if (error) {
    console.error("Error fetching events:", error)
    return []
  }

  return data || []
}

export async function searchEventsClient(query: string): Promise<EventWithProfile[]> {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      profiles!events_user_id_fkey (
        display_name,
        avatar_url,
        reputation_score
      )
    `)
    .eq("status", "published")
    .gte("date", new Date().toISOString().split("T")[0])
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,location.ilike.%${query}%,venue.ilike.%${query}%`)
    .order("date", { ascending: true })

  if (error) {
    console.error("Error searching events:", error)
    return []
  }

  return data || []
}

export async function getUserRecommendationsClient(userId: string): Promise<Recommendation[]> {
  const supabase = createBrowserClient()

  // Calculate recommendations first
  await supabase.rpc("calculate_recommendations", { target_user_id: userId })

  const { data, error } = await supabase
    .from("event_recommendations")
    .select(`
      *,
      events (
        *,
        profiles!events_user_id_fkey (
          display_name,
          avatar_url,
          reputation_score
        )
      )
    `)
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error fetching recommendations:", error)
    return []
  }

  return data || []
}

export async function updateEventViews(eventId: string): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.rpc("increment_event_views", { event_id: eventId })

  if (error) {
    console.error("Error updating event views:", error)
  }
}

export async function toggleEventAttendance(
  eventId: string,
  userId: string,
  status: "interested" | "attending" | "not_attending",
): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("event_attendees").upsert({
    event_id: eventId,
    user_id: userId,
    status: status,
  })

  if (error) {
    console.error("Error updating attendance:", error)
  }
}

export async function rateEvent(eventId: string, userId: string, rating: number): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("user_event_ratings").upsert({
    event_id: eventId,
    user_id: userId,
    rating: rating,
  })

  if (error) {
    console.error("Error rating event:", error)
  }
}
