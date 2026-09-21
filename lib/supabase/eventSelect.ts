// Shared event select helpers for Supabase queries.

export const plainEventSelect = `
  *,
  comments(count)
`;

export const eventSelectWithProfiles = `
  *,
  like_count,
  comments(count)
`;

export const eventSelectWithAttendance = `
  *,
  like_count,
  comments(count),
  event_attendees (
    id,
    event_id,
    user_id,
    status,
    created_at,
    profiles (
      display_name,
      avatar_url
    )
  )
`;

/**
 * Detects whether a Supabase/PostgREST error was triggered because the
 * optional `event_attendees` table (or its relation) is missing. This lets us
 * gracefully fall back to a lighter query so existing installs without the
 * attendance migration still show events instead of failing entirely.
 */
export function isMissingAttendanceRelation(error: any): boolean {
  if (!error) return false;

  const message = String(error.message ?? "").toLowerCase();

  return (
    message.includes("event_attendees") ||
    (message.includes("relation") && message.includes("does not exist") && message.includes("event")) ||
    error.code === "PGRST204" ||
    error.code === "PGRST201" ||
    error.code === "PGRST114" ||
    error.code === "42P01"
  );
}

/**
 * Detects when the optional `profiles` relation is unavailable so we can fall
 * back to a plain `*` select. Some legacy databases omit the profile helper
 * table but still need to render event listings.
 */
export function isMissingProfilesRelation(error: any): boolean {
  if (!error) return false;

  const message = String(error.message ?? "").toLowerCase();

  // This is intentionally specific to the `profiles` relation. We don't want
  // to accidentally trigger this fallback for other unrelated errors, such as
  // a missing `like_count` view.
  return (
    (message.includes("profiles") && message.includes("relation")) ||
    (message.includes("foreign key") && message.includes("profiles"))
  );
}
