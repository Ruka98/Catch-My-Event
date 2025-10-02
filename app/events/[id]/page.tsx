// app/events/[id]/page.tsx
// Server Component (do NOT add "use client")

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { SocialTopNav } from "@/components/navigation/social-top-nav";
import {
  Calendar,
  Clock,
  Globe2,
  Heart,
  MapPin,
  Mail,
  PenSquare,
  Phone,
  Ticket,
  User,
  Users,
  Eye,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getEventByIdServer } from "@/lib/supabase/events.server";
import { getAttendanceCounts, getAttendanceLabel } from "@/lib/eventAttendance";
import type { EventAttendee } from "@/lib/supabase/types";
import { CommentsSection } from "@/components/comments-section";
import { getCommentsForEvent } from "@/lib/supabase/comments.server";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await getEventByIdServer(params.id);

  if (!event) {
    return {
      title: "Event not found | Catch My Event",
      description: "The event you are looking for could not be located on Catch My Event.",
    };
  }

  const description = event.description
    ? event.description.slice(0, 155) + (event.description.length > 155 ? "…" : "")
    : `Discover ${event.title} on Catch My Event.`;
  const url = `https://catchmyevent.com/events/${event.id}`;
  const imageUrl = event.image_url ?? undefined;

  return {
    title: `${event.title} | Catch My Event`,
    description,
    alternates: {
      canonical: `/events/${event.id}`,
    },
    openGraph: {
      title: `${event.title} | Catch My Event`,
      description,
      url,
      type: "website",
      images: imageUrl
        ? [
            {
              url: imageUrl,
              alt: event.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} | Catch My Event`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = params;

  // use the server-only supabase client
  const supabase = createSupabaseServerClient();

  const [{ data: auth }, event] = await Promise.all([
    supabase.auth.getUser(),
    getEventByIdServer(id),
  ]);

  if (!event) {
    notFound();
  }

  const initialNavUser = auth?.user
    ? {
        id: auth.user.id,
        name:
          (auth.user.user_metadata as { name?: string; display_name?: string } | null)?.name ??
          (auth.user.user_metadata as { name?: string; display_name?: string } | null)?.display_name ??
          auth.user.email ??
          null,
        email: auth.user.email,
      }
    : null;

  const isOwner = auth?.user?.id && event.user_id === auth.user.id;
  if (event.status !== "published" && !isOwner) {
    notFound();
  }

  const canEdit = Boolean(isOwner);
  const hasCoordinates =
    event.latitude !== null && event.latitude !== undefined &&
    event.longitude !== null && event.longitude !== undefined;
  const lat = hasCoordinates ? Number(event.latitude) : null;
  const lng = hasCoordinates ? Number(event.longitude) : null;
  const mapEmbedUrl =
    hasCoordinates && lat !== null && lng !== null
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`
      : null;

  const attendanceCounts = getAttendanceCounts(event);
  const attendanceLabel = getAttendanceLabel(attendanceCounts);
  const priceValue = typeof event.price === "number" && !Number.isNaN(event.price) ? event.price : null;
  const priceLabel = priceValue === null ? "Price TBD" : priceValue === 0 ? "Free" : `LKR ${priceValue.toLocaleString()}`;
  const priceTone = priceValue === 0 ? "text-emerald-600" : "text-gray-900";
  const postedOn = event.created_at ? new Date(event.created_at) : null;
  const attendeeList: EventAttendee[] = Array.isArray(event.event_attendees) ? event.event_attendees : [];
  const confirmedAttendees = attendeeList.filter(
    (attendee) => attendee.status === "attending" || attendee.status === "both",
  );
  const interestedAttendees = [];
  const formatAttendeeName = (attendee: EventAttendee) =>
    attendee?.profiles?.display_name?.trim() || "Anonymous attendee";

  const startDateTime = (() => {
    if (!event.date) return null;
    const trimmedTime = event.time?.trim() ?? "";
    const has24HourTime = /^\d{2}:\d{2}/.test(trimmedTime);
    const candidate = has24HourTime ? new Date(`${event.date}T${trimmedTime}`) : new Date(event.date);
    return Number.isNaN(candidate.valueOf()) ? null : candidate;
  })();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? `Discover ${event.title} on Catch My Event`,
    startDate: startDateTime?.toISOString() ?? event.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: hasCoordinates
      ? "https://schema.org/OfflineEventAttendanceMode"
      : "https://schema.org/MixedEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue || event.location || "Sri Lanka",
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address || "",
        addressLocality: event.city || event.location || "",
        addressCountry: "LK",
      },
      geo:
        hasCoordinates && lat !== null && lng !== null
          ? {
              "@type": "GeoCoordinates",
              latitude: lat,
              longitude: lng,
            }
          : undefined,
    },
    image: event.image_url ? [event.image_url] : undefined,
    offers:
      priceValue !== null
        ? {
            "@type": "Offer",
            price: priceValue,
            priceCurrency: "LKR",
            availability: "https://schema.org/InStock",
          }
        : undefined,
    organizer: {
      "@type": "Organization",
      name: "Catch My Event",
      url: "https://catchmyevent.com",
    },
    url: `https://catchmyevent.com/events/${event.id}`,
  };

  const [comments, { data: likeData }] = await Promise.all([
    getCommentsForEvent(id, auth?.user?.id),
    auth?.user?.id
      ? supabase.from("likes").select("id").eq("event_id", id).eq("user_id", auth.user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const isLikedInitially = !!likeData;
  const initialLikes = event.like_count ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <SocialTopNav active="feed" initialUser={initialNavUser} />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-10">
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-sky-100/60">
          <div className="relative h-64 w-full sm:h-80">
            <Image
              src={event.image_url || "/placeholder.svg?height=480&width=960"}
              alt={event.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-6 text-white sm:p-8">
              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-white/80">
                {event.category && (
                  <Badge className="bg-white/20 px-3 py-1 text-white shadow-sm backdrop-blur">
                    {event.category}
                  </Badge>
                )}
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {event.location}
                  </span>
                )}
                {postedOn && (
                  <span>
                    Posted {postedOn.toLocaleDateString()} by{" "}
                    <Link href={`/profile/${event.user_id}`} className="hover:underline">
                      {event.profiles?.display_name || "a user"}
                    </Link>
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">{event.title}</h1>
              <p className="text-sm text-white/80">{attendanceLabel}</p>
            </div>
          </div>

          <div className="space-y-8 p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
              <section className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                      <Calendar className="h-4 w-4" /> When
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {new Date(event.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {event.time && (
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 text-sky-600" /> {event.time}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                      <MapPin className="h-4 w-4" /> Where
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      {[event.venue, event.address, event.city].filter(Boolean).join(", ") || "Sri Lanka"}
                    </p>
                    {hasCoordinates && (
                      <p className="text-xs text-gray-500">Tap "View on map" to see the precise pin.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                      <Ticket className="h-4 w-4" /> Tickets
                    </div>
                    <p className={`mt-2 text-lg font-semibold ${priceTone}`}>{priceLabel}</p>
                    {event.max_attendees && (
                      <p className="text-xs text-gray-500">Limited to {event.max_attendees} people</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                      <Users className="h-4 w-4" /> Buzz
                    </div>
                    <div className="mt-2 space-y-2 text-sm text-gray-700">
                      <p className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-emerald-500" /> {attendanceCounts.attending} going
                      </p>
                      <p className="flex items-center gap-2 text-xs text-gray-500">
                        <Eye className="h-4 w-4 text-gray-400" /> {event.views ?? 0} views
                      </p>
                    </div>
                  </div>
                </div>

                {event.description && (
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-6">
                    <h2 className="text-lg font-semibold text-gray-900">About this event</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-line">{event.description}</p>
                  </div>
                )}

                {mapEmbedUrl && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-gray-900">Location preview</h2>
                    <div className="overflow-hidden rounded-2xl border border-sky-100 shadow-sm">
                      <iframe title="Event location" src={mapEmbedUrl} className="h-80 w-full" allowFullScreen />
                    </div>
                  </div>
                )}
              </section>

              <aside className="space-y-6">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-900">Stay in touch</h2>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    {event.contact_email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-sky-600" />
                        <a className="text-sky-700 hover:underline" href={`mailto:${event.contact_email}`}>
                          {event.contact_email}
                        </a>
                      </p>
                    )}
                    {event.contact_phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-sky-600" />
                        <a className="text-sky-700 hover:underline" href={`tel:${event.contact_phone}`}>
                          {event.contact_phone}
                        </a>
                      </p>
                    )}
                    {event.website_url && (
                      <p className="flex items-center gap-2">
                        <Globe2 className="h-4 w-4 text-sky-600" />
                        <a
                          className="text-sky-700 hover:underline"
                          href={event.website_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visit website
                        </a>
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
                  <h2 className="text-base font-semibold text-gray-900">Quick actions</h2>
                  <div className="mt-4 flex flex-col gap-3">
                    <LikeButton
                      eventId={id}
                      initialLikes={initialLikes}
                      isLikedInitially={isLikedInitially}
                      user={auth.user}
                    />
                    <ShareButton eventId={id} />
                    <Link
                      href={`/map?eventId=${event.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700"
                    >
                      <MapPin className="h-4 w-4" /> View on map
                    </Link>
                    <Link
                      href="/map"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-200 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
                    >
                      Explore other events
                    </Link>
                    {canEdit && (
                      <Link
                        href={`/events/${event.id}/edit`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <PenSquare className="h-4 w-4" /> Edit this event
                      </Link>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-900">RSVP insights</h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {attendanceCounts.attending} going
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Going</h3>
                        {confirmedAttendees.length === 0 ? (
                          <p className="mt-1 text-xs text-gray-500">No confirmed attendees yet.</p>
                        ) : (
                          <ul className="mt-2 space-y-1 text-sm text-gray-700">
                            {confirmedAttendees.map((attendee) => (
                              <li key={attendee.id} className="flex items-center gap-2 rounded-lg bg-sky-50/60 px-2 py-1">
                                <User className="h-3.5 w-3.5 text-sky-600" />
                                <Link href={`/profile/${attendee.user_id}`} className="truncate hover:underline">
                                  {formatAttendeeName(attendee)}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </aside>
            </div>
            <div className="mt-8">
              <CommentsSection eventId={id} comments={comments} user={auth.user} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
