// app/dashboard/DashboardClient.tsx
"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/components/auth-guard";
import { getEventsForUserClient, type EventWithProfile } from "@/lib/supabase/events.client";

export default function DashboardClient() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const load = async () => {
      setLoading(true);
      try {
        const data = await getEventsForUserClient(user.id);
        setEvents(data);
      } catch (error) {
        console.error("Failed to load dashboard events", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-gray-600">
          Sign in to manage the events you host on Catch My Event.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your hosted events</span>
            <Link href="/post-event">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">Create new</Button>
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-gray-600">Loading your events...</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-600">
              You haven&apos;t posted any events yet. Share your first event with the community!
            </p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <p className="text-xs text-gray-600">
                    {new Date(event.date).toLocaleDateString()} {event.time ? `• ${event.time}` : ""}
                  </p>
                  <p className="text-xs text-gray-600">{event.venue}{event.location ? ` • ${event.location}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{event.category}</Badge>
                  <Link href={`/events/${event.id}`}>
                    <Button size="sm" variant="outline" className="bg-transparent text-xs">View</Button>
                  </Link>
                  <Link href={`/events/${event.id}/edit`}>
                    <Button size="sm" className="bg-orange-500 text-xs text-white hover:bg-orange-600">Edit</Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
