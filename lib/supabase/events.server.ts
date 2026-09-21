// server utilities for fetching events (Server Components / route handlers)
import {
  eventSelectWithAttendance,
  eventSelectWithProfiles,
  isMissingAttendanceRelation,
  isMissingProfilesRelation,
  plainEventSelect,
} from "./eventSelect";
import { createSupabaseServerClient } from "./server";
import { hydrateAttendanceForEvents } from "./attendanceHydrator";
import type { EventWithProfile } from "./types";

async function fetchEventsWithFallback(
  queryBuilder: (select: string) => any,
): Promise<{ events: EventWithProfile[]; fallbackUsed: boolean }> {
  let fallbackUsed = false;
  let select = eventSelectWithAttendance;

  while (true) {
    const { data, error } = await queryBuilder(select);

    if (!error) {
      return { events: (data ?? []) as EventWithProfile[], fallbackUsed };
    }

    if (select === eventSelectWithAttendance && isMissingAttendanceRelation(error)) {
      fallbackUsed = true;
      select = eventSelectWithProfiles;
      continue;
    }

    if (
      (select === eventSelectWithAttendance || select === eventSelectWithProfiles) &&
      isMissingProfilesRelation(error)
    ) {
      fallbackUsed = true;
      select = plainEventSelect;
      continue;
    }

    throw error;
  }
}

export async function getEventsServer(): Promise<EventWithProfile[]> {
  const supabase = createSupabaseServerClient();
  try {
    const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
      supabase
        .from("events")
        .select(select)
        .eq("status", "published")
        .order("created_at", { ascending: false })
    );

    return hydrateAttendanceForEvents(supabase as any, events, { fallbackUsed });
  } catch (error) {
    console.error("Failed to load events:", error);
    return [];
  }
}

export async function getEventByIdServer(id: string): Promise<EventWithProfile | null> {
  const supabase = createSupabaseServerClient();
  try {
    const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
      supabase
        .from("events")
        .select(select)
        .eq("id", id)
        .limit(1)
    );

    const hydrated = await hydrateAttendanceForEvents(supabase as any, events, { fallbackUsed });
    return hydrated[0] ?? null;
  } catch (error) {
    console.error("Failed to load event", error);
    return null;
  }
}

export async function getEventsForUserServer(userId: string): Promise<EventWithProfile[]> {
  const supabase = createSupabaseServerClient();
  try {
    const { events, fallbackUsed } = await fetchEventsWithFallback((select) =>
      supabase
        .from("events")
        .select(select)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
    );

    return hydrateAttendanceForEvents(supabase as any, events, { fallbackUsed });
  } catch (error) {
    console.error(`Failed to load events for user ${userId}:`, error);
    return [];
  }
}
