"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CalendarIcon,
  MapPin,
  Plus,
  Clock,
  Star,
  Filter,
  BookOpen,
  CheckCircle,
  Heart,
  Users,
  Eye,
  CalendarDays,
  MapIcon,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-guard"
import {
  getEventsClient,
  getUserRecommendationsClient,
  toggleEventAttendance,
  type EventWithProfile,
  type Recommendation,
} from "@/lib/supabase/events.client"
import { mainCategories } from "@/lib/constants/categories"
import { createClient } from "@/lib/supabase/client"
import { getAttendanceCounts, getAttendanceLabel } from "@/lib/eventAttendance"
import { cn } from "@/lib/utils"

type UserEvent = EventWithProfile & { userStatus: "attending" | "interested" | "both" }

export default function CalendarPage() {
  const { user } = useAuth()
  const supabaseClient = useMemo(() => createClient(), [])
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState("calendar")
  const [userLocation, setUserLocation] = useState({
    city: "Colombo",
    radius: 25, // km
    coordinates: { lat: 6.9271, lng: 79.8612 },
  })
  const [bookedDays, setBookedDays] = useState<string[]>([])
  const [events, setEvents] = useState<EventWithProfile[]>([])
  const [userEvents, setUserEvents] = useState<UserEvent[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const allEvents = await getEventsClient(user?.id ?? undefined)
      setEvents(allEvents)

      if (user?.id) {
        const userSpecificEvents: UserEvent[] = allEvents.flatMap((event) => {
          const attendee = event.event_attendees?.find(
            (item) => item.user_id === user.id && item.status !== "not_attending",
          )
          if (!attendee) return []
          return [
            {
              ...event,
              userStatus: attendee.status as "attending" | "interested" | "both",
            },
          ]
        })
        setUserEvents(userSpecificEvents)

        const bookedDates = userSpecificEvents.map((event) => event.date)
        setBookedDays(bookedDates)

        try {
          const recommendationData = await getUserRecommendationsClient(user.id)
          setRecommendations(recommendationData)
        } catch (error) {
          console.error("Error loading recommendations:", error)
        }
      } else {
        setUserEvents([])
        setBookedDays([])
        setRecommendations([])
      }
    } catch (error) {
      console.error("Error loading events:", error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    const hasRealtime = typeof (supabaseClient as any)?.channel === "function"
    if (!hasRealtime) return

    const channel = (supabaseClient as any)
      .channel("events-calendar")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        loadEvents()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "event_attendees" }, () => {
        loadEvents()
      })
      .subscribe()

    return () => {
      if (typeof (supabaseClient as any)?.removeChannel === "function") {
        ;(supabaseClient as any).removeChannel(channel)
      }
    }
  }, [supabaseClient, loadEvents])

  const handleEventInteraction = async (eventId: string, action: "interested" | "attending") => {
    if (!user) return

    try {
      await toggleEventAttendance(eventId, user.id, action)
      // Refresh events to show updated attendance
      await loadEvents()
    } catch (error) {
      console.error(`Error handling ${action}:`, error)
    }
  }

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return userEvents.filter((event) => event.date === dateStr)
  }

  // Get events for current month
  const getEventsForMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return userEvents.filter((event) => {
      const eventDate = new Date(event.date)
      return eventDate.getFullYear() === year && eventDate.getMonth() === month
    })
  }

  // Get nearby events based on user location
  const getNearbyEvents = () => {
    return events.filter((event) => event.location === userLocation.city).slice(0, 6) // Limit to 6 events
  }

  const selectedDateEvents = getEventsForDate(selectedDate)
  const monthEvents = getEventsForMonth(selectedDate)
  const nearbyEvents = getNearbyEvents()
  const attendingCount = monthEvents.filter(
    (event) => event.userStatus === "attending" || event.userStatus === "both",
  ).length
  const interestedCount = monthEvents.filter(
    (event) => event.userStatus === "interested" || event.userStatus === "both",
  ).length

  // Handle day booking
  const handleBookDay = (dateStr: string) => {
    if (bookedDays.includes(dateStr)) {
      setBookedDays((prev) => prev.filter((d) => d !== dateStr))
    } else {
      setBookedDays((prev) => [...prev, dateStr])
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hosting":
        return "bg-sky-100 text-sky-800"
      case "published":
        return "bg-sky-100 text-sky-800"
      case "attending":
        return "bg-green-100 text-green-800"
      case "interested":
        return "bg-sky-100 text-sky-800"
      case "both":
        return "bg-indigo-100 text-indigo-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatUserStatus = (status: UserEvent["userStatus"]) => {
    if (status === "both") return "Going + Interested"
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <main className="mx-auto max-w-7xl space-y-6 px-4 pb-16 pt-6">
        {!user && (
          <section className="space-y-6 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Calendar</h1>
                <p className="text-sm text-gray-600 sm:text-base">
                  Track events you are hosting, going to, or watching at a glance.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full border-sky-200 bg-transparent">
                  <Link href="/">Feed</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full border-sky-200 bg-transparent">
                  <Link href="/map">Event map</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="hidden sm:inline-flex items-center gap-2 bg-sky-600 text-white hover:bg-sky-700"
                >
                  <Link href="/post-event">
                    <Plus className="h-4 w-4" />
                    Post event
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                asChild
                className="flex h-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 px-5 py-4 text-white shadow-sm transition hover:from-sky-700 hover:to-blue-700"
              >
                <Link href="/map">
                  <span className="flex items-center gap-2 text-left text-sm font-semibold sm:text-base">
                    <MapIcon className="h-5 w-5" aria-hidden="true" /> Map
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="flex h-full items-center justify-between gap-3 rounded-2xl border-sky-300 px-5 py-4 text-left text-sky-700 transition hover:bg-sky-50 bg-transparent"
              >
                <Link href="/">
                  <span className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" /> Feed
                  </span>
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="hidden h-full items-center justify-between gap-3 rounded-2xl border-sky-300 px-5 py-4 text-left text-sky-700 transition hover:bg-sky-50 sm:flex bg-transparent"
              >
                <Link href="/profile">
                  <span className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                    <BookOpen className="h-5 w-5" aria-hidden="true" /> Profile
                  </span>
                </Link>
              </Button>
            </div>
          </section>
        )}

        {user && (
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">My Calendar</h1>
            <p className="text-sm text-gray-600">Track your events and schedule.</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
              <p className="text-gray-600">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="calendar" className="text-xs sm:text-sm">
                Calendar
              </TabsTrigger>
              <TabsTrigger value="schedule" className="text-xs sm:text-sm">
                Schedule
              </TabsTrigger>
              <TabsTrigger value="nearby" className="text-xs sm:text-sm">
                Nearby
              </TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs sm:text-sm">
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Calendar Tab */}
            <TabsContent value="calendar" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Calendar Widget */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span className="text-base">Event Calendar</span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <div className="flex items-center space-x-1">
                            <div className="h-2 w-2 rounded-full bg-sky-500"></div>
                            <span>Hosting</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            <span>Attending</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                            <span>Interested / Saved</span>
                          </div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        className="rounded-md border w-full"
                        modifiers={{
                          booked: bookedDays.map((date) => new Date(date)),
                          hasEvents: monthEvents.map((event) => new Date(event.date)),
                        }}
                        modifiersStyles={{
                          booked: { backgroundColor: "#fef3c7", color: "#d97706" },
                          hasEvents: { fontWeight: "bold", textDecoration: "underline" },
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Selected Date Details */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">
                        {selectedDate.toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedDateEvents.length > 0 ? (
                        selectedDateEvents.map((event) => {
                          const { attending, interested } = getAttendanceCounts(event)
                          const attendanceLabel = getAttendanceLabel({ attending, interested })

                          return (
                            <div key={event.id} className="space-y-3 rounded-lg border p-3">
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-gray-900 text-sm truncate pr-2">{event.title}</h4>
                                <Badge className={`${getStatusColor(event.userStatus)} text-xs flex-shrink-0`}>
                                  {formatUserStatus(event.userStatus)}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Clock className="mr-2 h-3 w-3 flex-shrink-0 text-sky-600" aria-hidden="true" />
                                  <span className="text-xs">{event.time}</span>
                                </div>
                                <div className="flex items-center">
                                  <MapPin className="mr-2 h-3 w-3 flex-shrink-0 text-sky-600" aria-hidden="true" />
                                  <span className="text-xs truncate">{event.venue}</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                                <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                                  {attendanceLabel}
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center gap-1">
                                    <Heart className="h-3 w-3 text-rose-500" /> {interested}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-emerald-500" /> {attending}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" /> {event.views ?? 0}
                                  </span>
                                </div>
                              </div>
                              <Button asChild size="sm" variant="outline" className="w-full bg-transparent text-xs">
                                <Link href={`/events/${event.id}`}>View details</Link>
                              </Button>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-6">
                          <CalendarIcon className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600 text-sm">No events on this day</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-transparent text-xs"
                            onClick={() => handleBookDay(selectedDate.toISOString().split("T")[0])}
                          >
                            <BookOpen className="w-3 h-3 mr-1" />
                            {bookedDays.includes(selectedDate.toISOString().split("T")[0])
                              ? "Unbook Day"
                              : "Book This Day"}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">This Month</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Events Attending</span>
                        <span className="font-semibold">{attendingCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Events Interested</span>
                        <span className="font-semibold">{interestedCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Days Booked</span>
                        <span className="font-semibold">{bookedDays.length}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* Schedule Tab */}
            <TabsContent value="schedule" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userEvents.map((event) => {
                  const { attending, interested } = getAttendanceCounts(event)
                  const attendanceLabel = getAttendanceLabel({ attending, interested })

                  return (
                    <Card key={event.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base truncate pr-2">{event.title}</CardTitle>
                          <Badge className={`${getStatusColor(event.userStatus)} text-xs flex-shrink-0`}>
                            {formatUserStatus(event.userStatus)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-sky-600" aria-hidden="true" />
                            <span className="text-xs truncate">
                              {new Date(event.date).toLocaleDateString()} at {event.time}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-sky-600" aria-hidden="true" />
                            <span className="text-xs truncate">
                              {event.venue}, {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                            {attendanceLabel}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-rose-500" /> {interested}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-emerald-500" /> {attending}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {event.views ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button asChild size="sm" variant="outline" className="w-full bg-transparent text-xs">
                            <Link href={`/events/${event.id}`}>View details</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* Nearby Events Tab */}
            <TabsContent value="nearby" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Events Near {userLocation.city}</h3>
                  <p className="text-gray-600 text-sm">Within {userLocation.radius} km radius</p>
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyEvents.map((event) => {
                  const { attending, interested } = getAttendanceCounts(event)
                  const attendanceLabel = getAttendanceLabel({ attending, interested })
                  const priceValue = typeof event.price === "number" && !Number.isNaN(event.price) ? event.price : null
                  const priceLabel =
                    priceValue === null ? "Price TBD" : priceValue === 0 ? "Free" : `LKR ${priceValue.toLocaleString()}`
                  const priceTone = priceValue === 0 ? "text-emerald-600" : "text-gray-900"

                  const attendeeRecord = user ? event.event_attendees?.find((item) => item.user_id === user.id) : null
                  const isInterested = attendeeRecord?.status === "interested" || attendeeRecord?.status === "both"
                  const isGoing = attendeeRecord?.status === "attending" || attendeeRecord?.status === "both"

                  return (
                    <Card key={event.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base truncate">{event.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-sky-600" aria-hidden="true" />
                            <span className="text-xs truncate">
                              {new Date(event.date).toLocaleDateString()} at {event.time}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="mr-2 h-4 w-4 flex-shrink-0 text-sky-600" aria-hidden="true" />
                            <span className="text-xs truncate">
                              {event.venue} • {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Badge variant="outline" className="text-xs">
                            {event.category}
                          </Badge>
                          <span className={`font-semibold text-sm ${priceTone}`}>{priceLabel}</span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500">
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                            {attendanceLabel}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Heart className="h-3 w-3 text-rose-500" /> {interested}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3 text-emerald-500" /> {attending}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="h-3 w-3" /> {event.views ?? 0}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <Button
                            size="sm"
                            variant="outline"
                            aria-pressed={isInterested}
                            className={cn(
                              "w-full text-xs",
                              isInterested ? "border-sky-300 bg-sky-100 text-sky-800" : "hover:bg-sky-50",
                            )}
                            onClick={() => handleEventInteraction(event.id, "interested")}
                          >
                            <Star className="w-3 h-3 mr-1" />
                            Interested
                          </Button>
                          <Button
                            size="sm"
                            aria-pressed={isGoing}
                            className={cn(
                              "w-full text-xs text-white",
                              isGoing ? "bg-sky-700 hover:bg-sky-700" : "bg-sky-600 hover:bg-sky-700",
                            )}
                            onClick={() => handleEventInteraction(event.id, "attending")}
                          >
                            Attend Event
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            {/* Location Preferences Tab */}
            <TabsContent value="preferences" className="space-y-4">
              <div className="max-w-2xl mx-auto">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Location Preferences</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Location</label>
                      <select
                        value={userLocation.city}
                        onChange={(e) => setUserLocation((prev) => ({ ...prev, city: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
                      >
                        <option value="Colombo">Colombo</option>
                        <option value="Kandy">Kandy</option>
                        <option value="Galle">Galle</option>
                        <option value="Negombo">Negombo</option>
                        <option value="Jaffna">Jaffna</option>
                        <option value="Matara">Matara</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Radius: {userLocation.radius} km
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={userLocation.radius}
                        onChange={(e) =>
                          setUserLocation((prev) => ({ ...prev, radius: Number.parseInt(e.target.value) }))
                        }
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>5 km</span>
                        <span>100 km</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Preferred Event Categories</label>
                      <div className="grid grid-cols-2 gap-3">
                        {mainCategories.map((category) => (
                          <label key={category} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                            <span className="text-sm">{category}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Notification Preferences</label>
                      <div className="space-y-3">
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Notify about nearby events</span>
                          <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Daily event recommendations</span>
                          <input type="checkbox" className="rounded border-gray-300" />
                        </label>
                        <label className="flex items-center justify-between">
                          <span className="text-sm">Event reminders</span>
                          <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                        </label>
                      </div>
                    </div>

                    <Button className="w-full bg-sky-600 hover:bg-sky-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Preferences
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}
