import type { Metadata } from "next"
import { WelcomeClient } from "./welcome-client"

export const metadata: Metadata = {
  title: "Catch My Event | Discover & Publish Sri Lankan Events",
  description:
    "Learn how Catch My Event helps you publish events for free, explore local happenings, and navigate interactive maps and feeds across Sri Lanka.",
}

export default function WelcomePage() {
  return <WelcomeClient />
}
