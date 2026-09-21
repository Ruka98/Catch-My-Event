"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"
import { getEventsClient, searchEventsClient, deleteEventClient, type EventWithProfile } from "@/lib/supabase/events.client"
import { useAuth } from "@/components/auth-guard"
import { EventCard } from "@/components/event-card"
import { useToast } from "@/hooks/use-toast"
import { mainCategories } from "@/lib/constants/categories"

const categories = ["All", ...mainCategories]
const HIDDEN_EVENTS_KEY = "hidden_events"

export default function EventsPage() {
  const [events, setEvents] = useState<EventWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [priceFilter, setPriceFilter] = useState("all")
  const [selectedDate, setSelectedDate] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [hiddenEvents, setHiddenEvents] = useState<string[]>([])
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    // Load hidden events from localStorage on initial render
    const storedHiddenEvents = localStorage.getItem(HIDDEN_EVENTS_KEY)
    if (storedHiddenEvents) {
      setHiddenEvents(JSON.parse(storedHiddenEvents))
    }
  }, [])

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      let eventData: EventWithProfile[] = []
      if (searchTerm.trim()) {
        eventData = await searchEventsClient(searchTerm, user?.id)
      } else {
        eventData = await getEventsClient(user?.id ?? undefined)
      }
      setEvents(eventData)
    } catch (error) {
      console.error("Error loading events:", error)
      toast({
        title: "Error loading events",
        description: "Could not fetch events. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [searchTerm, user?.id, toast])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleHide = (eventId: string) => {
    const newHiddenEvents = [...hiddenEvents, eventId]
    setHiddenEvents(newHiddenEvents)
    localStorage.setItem(HIDDEN_EVENTS_KEY, JSON.stringify(newHiddenEvents))
    toast({
        title: "Event Hidden",
        description: "The event will no longer be shown in your feed.",
    })
  }

  const handleDelete = async (eventId: string) => {
    if (!window.confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return
    }

    try {
      await deleteEventClient(eventId)
      setEvents((prev) => prev.filter((event) => event.id !== eventId))
      toast({
        title: "Event Deleted",
        description: "The event has been successfully deleted.",
      })
    } catch (error) {
      console.error("Error deleting event:", error)
      toast({
        title: "Error Deleting Event",
        description: "Could not delete the event. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredEvents = events.filter((event) => {
    if (hiddenEvents.includes(event.id)) {
      return false
    }

    const priceValue = event.price ?? 0
    const matchesCategory = selectedCategory === "All" || event.category === selectedCategory
    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && priceValue === 0) ||
      (priceFilter === "paid" && priceValue > 0)
    const matchesDate = !selectedDate || event.date === selectedDate

    return matchesCategory && matchesPrice && matchesDate
  })

  const handleSearch = () => {
    loadEvents()
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-full max-w-md mx-auto">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400"
                  aria-hidden="true"
                />
                <Input
                  type="text"
                  placeholder="Search events or locations"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="h-12 rounded-full border-2 border-sky-200 bg-white/95 pl-12 pr-4 text-sm shadow-inner focus:border-sky-500 focus:ring-sky-200"
                  aria-label="Search events"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="h-12 rounded-full bg-sky-600 px-6 text-white hover:bg-sky-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="h-12 rounded-full border-sky-200 bg-white/95 px-4 sm:px-6"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 gap-4 border-t border-sky-100 pt-4 sm:grid-cols-3">
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 w-full rounded-full border border-sky-200 bg-white/95 px-4 text-sm font-medium text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="relative">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-10 w-full rounded-full border border-sky-200 bg-white/95 px-4 text-sm font-medium text-gray-700 focus:border-sky-500 focus:ring-sky-200"
                    />
                  </div>
                </div>
                <div>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="h-10 w-full rounded-full border border-sky-200 bg-white/95 px-4 text-sm font-medium text-gray-700 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="all">All prices</option>
                    <option value="free">Free events</option>
                    <option value="paid">Paid events</option>
                  </select>
                </div>
              </div>
            )}
        </div>
      </div>

      <h1 className="text-2xl font-semibold mb-4">All Events</h1>
      {loading ? (
         <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-500"></div>
            <p className="text-gray-600">Loading events...</p>
          </div>
      ) : filteredEvents.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEvents.map((event: EventWithProfile) => (
            <EventCard
              key={event.id}
              event={event}
              onAttendanceUpdate={loadEvents}
              onHide={handleHide}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}