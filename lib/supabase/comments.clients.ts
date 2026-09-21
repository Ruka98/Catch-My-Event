"use client";
import { createBrowserClient } from "@supabase/ssr";

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function addComment(payload: {
  event_id: string;
  user_id: string;
  text: string;
}) {
  const { error } = await supabase().from("comments").insert(payload);
  if (error) throw error;
}

export async function listComments(event_id: string) {
  const { data, error } = await supabase()
    .from("comments")
    .select("*")
    .eq("event_id", event_id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
