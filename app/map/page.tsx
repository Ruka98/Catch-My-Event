import type { Metadata } from "next"
import MapClient from "./map-client"

export const metadata: Metadata = {
  title: "Event Map",
  description:
    "Explore an interactive map of events happening across Sri Lanka. Find local events, get directions, and discover what's new in your area.",
  alternates: {
    canonical: "/map",
  },
  openGraph: {
    title: "Event Map | Catch My Event",
    description: "Discover local events on an interactive map.",
    url: "https://catchmyevent.com/map",
  },
}

export default function MapPage() {
  return <MapClient />
}