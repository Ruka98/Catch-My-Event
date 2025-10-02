import type { EventAttendee, EventWithProfile } from "./supabase/types";

type AttendanceSource = Pick<EventWithProfile, "event_attendees"> | {
  event_attendees?: EventAttendee[] | null;
};

export function getAttendanceCounts(
  event: AttendanceSource,
): { attending: number } {
  if (!event || !Array.isArray(event.event_attendees)) {
    return { attending: 0 };
  }

  let attending = 0;

  for (const attendee of event.event_attendees) {
    if (!attendee || typeof attendee.status !== "string") continue;

    if (attendee.status === "attending") {
      attending += 1;
    }
  }

  return { attending };
}

export function getAttendanceLabel({ attending }: {
  attending: number;
}): string {
  if (attending > 0) return `${attending} going`;
  return "Be the first to RSVP";
}
