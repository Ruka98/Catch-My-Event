"use client";

import { useMemo, useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Actor = { id: string; username: string | null };
type EventLite = { id: string; title: string | null };

export type NotificationItem = {
  id: string;
  created_at: string;
  type: string | null;
  read: boolean | null;
  events?: EventLite | null;
  profiles?: Actor | null;
};

type Props = {
  notifications: NotificationItem[] | null | undefined;
};

export default function Notifications({ notifications }: Props) {
  // ✅ Normalize to array
  const data = Array.isArray(notifications) ? notifications : [];

  // Optional local optimistic state
  const [local, setLocal] = useState<NotificationItem[]>(data);
  const current = local.length ? local : data;

  const unreadIds = useMemo(
    () => current.filter((n) => !n.read).map((n) => n.id),
    [current]
  );

  const [isPending, startTransition] = useTransition();

  const markAsRead = useCallback(() => {
    if (unreadIds.length === 0) return;

    // Optimistic UI: mark locally
    startTransition(() => {
      setLocal((prev) =>
        (prev.length ? prev : data).map((n) =>
          unreadIds.includes(n.id) ? { ...n, read: true } : n
        )
      );
    });

    // TODO: If you want, call a server action or Supabase update here.
    // Example (uncomment and ensure you have a browser client):
    //
    // const supabase = createClient(); // from your client util
    // supabase
    //   .from("notifications")
    //   .update({ read: true })
    //   .in("id", unreadIds)
    //   .then(({ error }) => {
    //     if (error) {
    //       // roll back if needed
    //     }
    //   });
  }, [unreadIds, data]);

  if (current.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {unreadIds.length} unread
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={markAsRead}
          disabled={isPending || unreadIds.length === 0}
        >
          {isPending ? "Marking…" : "Mark all as read"}
        </Button>
      </div>

      <ul className="space-y-3">
        {current.map((n) => (
          <li
            key={n.id}
            className={`rounded-xl border p-4 ${
              n.read ? "bg-white" : "bg-sky-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {renderTitle(n) ?? "Notification"}
              </div>
              {!n.read && (
                <span className="ml-3 inline-block h-2 w-2 rounded-full bg-sky-500" />
              )}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {new Date(n.created_at).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function renderTitle(n: NotificationItem) {
  const actor = n.profiles?.username ?? "Someone";
  const eventTitle = n.events?.title ?? "your event";

  switch (n.type) {
    case "event_like":
      return `${actor} liked your event: "${eventTitle}"`;
    case "event_attendance":
      return `${actor} is attending your event: "${eventTitle}"`;
    case "like":
      return `${actor} liked ${eventTitle}`;
    case "comment":
      return `${actor} commented on ${eventTitle}`;
    case "follow":
      return `${actor} followed you`;
    default:
      return `${actor} sent you a notification`;
  }
}
