import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SocialTopNav } from "@/components/navigation/social-top-nav";
import ProfilePageComponent from "../ProfilePage";
import type { Profile, Event, EventWithCounts } from "@/types/events";

type ProfilePageProps = {
  params: { id: string };
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (profileError || !profileData) {
    notFound();
  }

  const profile = profileData as Profile;
  const isOwner = user?.id === profile.id;

  const eventsPromise = supabase
    .from("events")
    .select(
      "*, profiles!events_profile_id_fkey(*), like_count, comments(count), event_attendees(count)",
    )
    .eq("profile_id", profile.id)
    .order("start_time", { ascending: false });

  const attendingEventsPromise = isOwner
    ? supabase
        .from("event_attendees")
        .select("event:events!inner(*)")
        .eq("user_id", user.id)
    : Promise.resolve({ data: [], error: null });

  const [
    { data: eventsData, error: eventsError },
    { data: attendingEventsData, error: attendingEventsError },
  ] = await Promise.all([eventsPromise, attendingEventsPromise]);

  if (eventsError || attendingEventsError) {
    // Decide how to handle errors, maybe show a generic error page
    // For now, we'll log it and continue, but in a real app, you might redirect
    console.error("Error fetching events:", eventsError || attendingEventsError);
  }

    const attendingEvents: Event[] =
    attendingEventsData?.map((rsvp: { event: Event }) => rsvp.event) || [];

  const attendingEventIds = new Set(attendingEvents.map((e) => e.id));

  const events: EventWithCounts[] =
    (eventsData as any[])?.map((event) => {
      const { event_attendees, ...rest } = event;
      const attendee_count = event_attendees[0]?.count ?? 0;
      const user_is_attending = attendingEventIds.has(event.id);

      return {
        ...rest,
        attendee_count,
        user_is_attending,
      };
    }) || [];

  const initialNavUser = user
    ? {
        id: user.id,
        name:
          profile.full_name ??
          profile.display_name ??
          profile.user_name ??
          user.email ??
          null,
        email: user.email ?? null,
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-100">
      <SocialTopNav active="profile" initialUser={initialNavUser} />
      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-16 pt-8">
        <ProfilePageComponent
          profile={profile}
          isOwner={isOwner}
          initialEvents={events}
          initialAttendingEvents={attendingEvents}
        />
      </main>
    </div>
  );
}