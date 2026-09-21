// components/Events.tsx
"use client";

import * as React from "react";
// ⬇️ change this line:
import type { EventRow } from "@/lib/supabase/types"; 

type Props = {
  events: EventRow[];
};

export default function Events({ events }: Props) {
  if (!events?.length) {
    return (
      <div className="p-6 rounded-xl border">
        <p className="text-sm text-gray-500">No events found.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {events.map((e) => (
        <li key={e.id} className="p-4 rounded-xl border">
          <div className="font-semibold">{e.title}</div>
          {e.description ? (
            <div className="text-sm text-gray-600 mt-1">{e.description}</div>
          ) : null}
          {e.created_at ? (
            <div className="text-xs text-gray-400 mt-2">
              Created {new Date(e.created_at).toLocaleString()}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
