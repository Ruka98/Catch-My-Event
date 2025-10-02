import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import "./globals.css"
import { AuthProvider } from "@/components/auth-guard"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: {
    default: "Catch My Event | Free Event Publishing & Local Event Discovery",
    template: "%s | Catch My Event",
  },
  description:
    "Catch My Event helps you publish events for free, explore local happenings, and browse interactive event maps and feeds across Sri Lanka.",
  keywords: [
    "Catch My Event",
    "free publish event",
    "find events",
    "check local events",
    "Sri Lanka events",
    "event discovery platform",
  ],
  metadataBase: new URL("https://catchmyevent.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Catch My Event | Free Event Publishing & Local Event Discovery",
    description:
      "Browse the interactive map, stay up to date with the event feed, and publish your next Sri Lankan event for free on Catch My Event.",
    url: "https://catchmyevent.com",
    siteName: "Catch My Event",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catch My Event | Free Event Publishing & Local Event Discovery",
    description:
      "Publish events without fees, explore the interactive map, and catch local happenings with Catch My Event.",
  },
  generator: "v0.app",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.className}>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
