import { createClient } from "@supabase/supabase-js"
import "dotenv/config"
import fs from "fs"

async function generateSitemap() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase URL or Key is not defined in the environment variables.")
    return
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: events, error } = await supabase.from("events").select("id, updated_at").eq("status", "published")

  if (error) {
    console.error("Error fetching events:", error)
    return
  }

  const baseUrl = "https://catchmyevent.com"
  const today = new Date().toISOString().split("T")[0]

  const sitemap = `
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url>
        <loc>${baseUrl}</loc>
        <lastmod>${today}</lastmod>
        <priority>1.0</priority>
      </url>
      <url>
        <loc>${baseUrl}/map</loc>
        <lastmod>${today}</lastmod>
        <priority>0.8</priority>
      </url>
      ${events
        .map(
          (event) => `
        <url>
          <loc>${baseUrl}/events/${event.id}</loc>
          <lastmod>${new Date(event.updated_at).toISOString().split("T")[0]}</lastmod>
          <priority>0.9</priority>
        </url>
      `
        )
        .join("")}
    </urlset>
  `

  fs.writeFileSync("public/sitemap.xml", sitemap.trim())
  console.log("Sitemap generated successfully!")
}

generateSitemap()