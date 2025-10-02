"use client"

import { useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, MapIcon, Megaphone } from "lucide-react"
import { SocialTopNav } from "@/components/navigation/social-top-nav"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/components/auth-guard"

export function WelcomeClient() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    if (user) {
      router.replace("/")
    }
  }, [loading, router, user])

  const handleStart = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("catchMyEventIntroSeen", "true")
    }
    router.push("/")
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <SocialTopNav active="feed" />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-16 pt-10">
        <section className="grid gap-8 rounded-3xl bg-white/95 p-8 shadow-xl ring-1 ring-sky-100/60 md:grid-cols-[2fr,1fr]">
          <div className="space-y-5">
            <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-500 via-fuchsia-500 to-blue-500 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-sm">
              Catch My Event
            </span>
            <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl md:text-5xl">
              Catch local events, publish for free, and grow your audience.
            </h1>
            <p className="text-base text-gray-600">
              Catch My Event is your all-in-one Sri Lankan event discovery hub. Publish events for free, check local happenings, and explore our interactive map and live event feed to find what&apos;s next.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleStart} size="lg" className="bg-sky-600 text-white hover:bg-sky-700">
                Start exploring events
              </Button>
              <Button asChild variant="outline" size="lg" className="border-sky-200 text-sky-700 hover:bg-sky-50">
                <Link href="/auth/signup">Create a free account</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <div className="flex items-start gap-3">
                <Megaphone className="mt-1 h-5 w-5 text-sky-500" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Free event publishing</h2>
                  <p className="text-sm text-gray-600">
                    Share concerts, meetups, community gatherings, and more without paying a rupee.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <MapIcon className="mt-1 h-5 w-5 text-sky-500" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Interactive map &amp; feed</h2>
                  <p className="text-sm text-gray-600">
                    Browse events visually on the map or scroll through the live feed to never miss a happening near you.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-100 bg-white p-4">
              <div className="flex items-start gap-3">
                <Calendar className="mt-1 h-5 w-5 text-sky-500" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Smart event tools</h2>
                  <p className="text-sm text-gray-600">
                    Track RSVPs, highlight featured listings, and let guests check event details in a clean, mobile-first layout.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl bg-white/95 p-8 shadow-xl ring-1 ring-sky-100/60 lg:grid-cols-3">
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
              Why Catch My Event
            </span>
            <h2 className="text-2xl font-bold text-gray-900">Built for event lovers &amp; creators</h2>
            <p className="text-sm text-gray-600">
              Whether you&apos;re hosting a meetup or searching for your next night out, our tools make it simple to publish, discover, and share Sri Lankan events.
            </p>
            <Button onClick={handleStart} className="mt-auto w-full bg-sky-600 text-white hover:bg-sky-700">
              Jump into the feed
            </Button>
          </div>
          <div className="space-y-4 rounded-2xl border border-dashed border-sky-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">For event organizers</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                Publish unlimited events without platform fees.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                Spotlight featured happenings to boost visibility.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" aria-hidden="true" />
                Keep audiences informed with real-time updates.
              </li>
            </ul>
          </div>
          <div className="space-y-4 rounded-2xl border border-dashed border-sky-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900">For event seekers</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-500" aria-hidden="true" />
                Filter by category, price, and time to find the perfect plan.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-500" aria-hidden="true" />
                Explore events geographically with our interactive map.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-500" aria-hidden="true" />
                Save favourites and share them with friends instantly.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
