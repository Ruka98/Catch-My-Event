"use client";
import { supabaseBrowser } from "./client";

// Optional helper for uploading a public image to Supabase Storage.
export async function uploadPublicImage(file: File) {
  const s = supabaseBrowser();
  const bucket = "event-images";
  const filename = `${crypto.randomUUID()}-${file.name}`;
  const { data, error } = await s.storage.from(bucket).upload(filename, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data: pub } = s.storage.from(bucket).getPublicUrl(data.path);
  return pub.publicUrl;
}
