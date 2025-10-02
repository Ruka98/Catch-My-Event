"use client";
import { createBrowserClient } from "@supabase/ssr";

function supabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function getCategories() {
  const s = supabase();
  const { data, error } = await s.from("categories").select("name");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data.map((category) => category.name);
}

export async function getSubcategories(category: string) {
    const s = supabase();
    // TODO: This is inefficient and should be replaced with a dedicated subcategories table in the future.
    const { data, error } = await s
      .from("events")
      .select("subcategory")
      .eq("category", category)
      .not("subcategory", "is", null);

    if (error) {
      console.error("Error fetching subcategories:", error);
      return [];
    }

    const subcategories = [...new Set(data.map((event) => event.subcategory))];

    return subcategories;
  }