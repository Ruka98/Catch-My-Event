"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function deleteEventAction(id: string) {
  const supabase = supabaseServer();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/");
}

export async function updateEventAction(formData: FormData) {
  const supabase = supabaseServer();
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) throw new Error("Not authenticated");

  const id = String(formData.get("id"));
  const title = String(formData.get("title") || "");
  const description = String(formData.get("description") || "");
  const event_date = String(formData.get("event_date") || "");
  const location = String(formData.get("location") || "");

  const { error } = await supabase
    .from("events")
    .update({ title, description, event_date, location })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${id}/edit`);
  revalidatePath("/profile");
  revalidatePath("/");
}
