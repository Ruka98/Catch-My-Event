import type { EventAttendee, EventWithProfile } from "./types";
import { isMissingAttendanceRelation, isMissingProfilesRelation } from "./eventSelect";

type SupabaseLike = {
  from(table: string): {
    select(columns: string): {
      in(column: string, values: string[]): Promise<{ data: unknown; error: any }>;
    };
  };
};

function mergeAttendees(
  event: EventWithProfile,
  incoming: Map<string, EventAttendee[]>,
  fallbackUsed: boolean,
): EventWithProfile {
  const existing = Array.isArray(event.event_attendees) ? event.event_attendees : [];
  const hydrated = incoming.get(event.id) ?? [];

  if (!fallbackUsed && existing.length > 0) {
    // The original query already returned attendees; keep them.
    return event;
  }

  if (existing.length === 0) {
    return {
      ...event,
      event_attendees: hydrated,
    };
  }

  if (hydrated.length === 0) {
    return event;
  }

  const seen = new Set(existing.map((attendee) => `${attendee.user_id}-${attendee.status}`));
  const merged = [...existing];

  for (const attendee of hydrated) {
    const key = `${attendee.user_id}-${attendee.status}`;
    if (!seen.has(key)) {
      merged.push(attendee);
      seen.add(key);
    }
  }

  return {
    ...event,
    event_attendees: merged,
  };
}

export async function hydrateAttendanceForEvents(
  client: SupabaseLike,
  events: EventWithProfile[],
  { fallbackUsed = false }: { fallbackUsed?: boolean } = {},
): Promise<EventWithProfile[]> {
  if (!Array.isArray(events) || events.length === 0) {
    return events;
  }

  const needsHydration =
    fallbackUsed || events.some((event) => !Array.isArray(event.event_attendees));

  if (!needsHydration) {
    return events;
  }

  const targetEvents = fallbackUsed
    ? events
    : events.filter((event) => !Array.isArray(event.event_attendees));

  const eventIds = targetEvents
    .map((event) => event.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (eventIds.length === 0) {
    return events;
  }

  const selects = [
    "id, event_id, user_id, status, created_at, profiles:profiles(display_name, avatar_url)",
    "id, event_id, user_id, status, created_at",
  ];

  for (const select of selects) {
    const { data, error } = await client
      .from("event_attendees")
      .select(select)
      .in("event_id", eventIds);

    if (!error) {
      const attendeesByEvent = new Map<string, EventAttendee[]>();

      for (const attendee of (data as EventAttendee[] | null) ?? []) {
        if (!attendee?.event_id) continue;
        const list = attendeesByEvent.get(attendee.event_id) ?? [];
        list.push(attendee);
        attendeesByEvent.set(attendee.event_id, list);
      }

      return events.map((event) => mergeAttendees(event, attendeesByEvent, fallbackUsed));
    }

    if (select === selects[0] && isMissingProfilesRelation(error)) {
      // Retry without the profile join if the relationship is absent.
      continue;
    }

    if (isMissingAttendanceRelation(error)) {
      // Older databases might not have the attendance table at all; keep the original events.
      return events;
    }

    console.warn("Failed to hydrate attendance data", error);
    return events;
  }

  return events;
}
