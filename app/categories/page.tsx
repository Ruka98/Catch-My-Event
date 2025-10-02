"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  MapPin,
  Search,
  ArrowLeft,
  Music,
  Code,
  Utensils,
  Palette,
  Trophy,
  Briefcase,
  Users,
  GraduationCap,
  Heart,
  Star,
  PartyPopper,
  Sprout,
  Ticket,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth-guard"
import { getEventsClient, type EventWithProfile } from "@/lib/supabase/events.client"
import { categoryData as newCategoryData } from "@/lib/constants/categories"

// Enhanced categories with icons and descriptions
const categoryIconMap: { [key: string]: React.ElementType } = {
  Entertainment: Ticket,
  "Arts & Culture": Palette,
  "Sports & Fitness": Trophy,
  "Food & Drink": Utensils,
  "Education & Learning": GraduationCap,
  "Social & Community": Users,
  "Celebrations & Lifestyle": PartyPopper,
  "Business & Professional": Briefcase,
}

const categoryData = newCategoryData.categories.map((category) => ({
  name: category.name,
  icon: categoryIconMap[category.name] || Sprout,
  description: `Explore events in the ${category.name.toLowerCase()} category.`,
  color: "bg-gray-100 text-gray-800",
  subcategories: category.subcategories,
}))

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [priceFilter, setPriceFilter] = useState("all")
  const [dateFilter, setDateFilter] = useState("all")
  const [events, setEvents] = useState<EventWithProfile[]>([])
  const { user } = useAuth()

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const fetched = await getEventsClient()
        setEvents(fetched)
      } catch (error) {
        console.error("Failed to load events", error)
      }
    }

    loadEvents()
  }, [])

  const getCategoryCount = (categoryName: string) => {
    return events.filter((event) => event.category === categoryName).length
  }

  const getSubcategoryCount = (subcategoryName: string) => {
    return events.filter(
      (event) =>
        (event as EventWithProfile & { subcategory?: string | null }).subcategory === subcategoryName,
    ).length
  }

  const filteredEvents = events.filter((event) => {
    const eventWithSubcategory = event as EventWithProfile & { subcategory?: string | null }
    const matchesCategory = !selectedCategory || event.category === selectedCategory
    const matchesSubcategory =
      !selectedSubcategory || eventWithSubcategory.subcategory === selectedSubcategory
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      event.title.toLowerCase().includes(term) ||
      (event.location ?? "").toLowerCase().includes(term) ||
      (event.description ?? "").toLowerCase().includes(term)

    const matchesPrice =
      priceFilter === "all" ||
      (priceFilter === "free" && event.price === 0) ||
      (priceFilter === "paid" && event.price > 0)

    const eventDate = new Date(event.date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && eventDate.toDateString() === today.toDateString()) ||
      (dateFilter === "tomorrow" && eventDate.toDateString() === tomorrow.toDateString()) ||
      (dateFilter === "week" && eventDate <= nextWeek && eventDate >= today)

    return matchesCategory && matchesSubcategory && matchesSearch && matchesPrice && matchesDate
  })

  const selectedCategoryData = categoryData.find((cat) => cat.name === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-orange-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Events</span>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Catch My Event</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {user ? (
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button className="bg-orange-500 hover:bg-orange-600">Sign In</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {selectedCategory
              ? selectedSubcategory
                ? `${selectedSubcategory} Events`
                : `${selectedCategory} Events`
              : "Event Categories"}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {selectedCategory
              ? selectedCategoryData?.description
              : "Explore events by category and find exactly what interests you"}
          </p>
        </div>

        {!selectedCategory ? (
          /* Categories Grid */
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categoryData.map((category) => {
              const IconComponent = category.icon
              const count = getCategoryCount(category.name)
              return (
                <Card
                  key={category.name}
                  className="cursor-pointer border-orange-100 transition-all duration-300 hover:border-orange-300 hover:shadow-lg"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{category.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="mb-4 text-gray-600">{category.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={category.color}>{count} events</Badge>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        Explore
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : !selectedSubcategory ? (
          /* Subcategories Grid */
          <div>
            <Button variant="outline" onClick={() => setSelectedCategory(null)} className="mb-8 bg-transparent">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Categories
            </Button>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {selectedCategoryData?.subcategories.map((subcategory) => (
                <Card
                  key={subcategory}
                  className="cursor-pointer border-purple-100 transition-all duration-300 hover:border-purple-300 hover:shadow-lg"
                  onClick={() => setSelectedSubcategory(subcategory)}
                >
                  <CardHeader>
                    <CardTitle>{subcategory}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className="bg-purple-100 text-purple-800">
                      {getSubcategoryCount(subcategory)} events
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Events View */
          <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <Button
                variant="outline"
                onClick={() => setSelectedSubcategory(null)}
                className="bg-transparent"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to {selectedCategory}
              </Button>

              <div className="flex flex-wrap gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                {/* Price Filter */}
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Prices</option>
                  <option value="free">Free Events</option>
                  <option value="paid">Paid Events</option>
                </select>

                {/* Date Filter */}
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                  <option value="week">This Week</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-between">
              <p className="text-gray-600">
                {filteredEvents.length} {selectedSubcategory.toLowerCase()} events found
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                  <option>Date</option>
                  <option>Price</option>
                  <option>Popularity</option>
                </select>
              </div>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map((event) => (
                <Card
                  key={event.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow duration-300 border-orange-100"
                >
                  <div className="relative">
                    <img
                      src={event.image || "/placeholder.svg"}
                      alt={event.title}
                      className="w-full h-48 object-cover"
                    />
                    <Badge className="absolute top-3 left-3 bg-orange-500 hover:bg-orange-600">{event.category}</Badge>
                    {event.featured && (
                      <Badge className="absolute top-3 right-3 bg-yellow-500 hover:bg-yellow-600">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {event.price === 0 && (
                      <Badge className="absolute bottom-3 left-3 bg-green-500 hover:bg-green-600">Free</Badge>
                    )}
                  </div>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2">{event.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-2 text-orange-500" />
                        {new Date(event.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        at {event.time}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-orange-500" />
                        {event.venue}, {event.location}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {event.price === 0 ? (
                          <span className="font-semibold text-green-600">Free</span>
                        ) : (
                          <span className="font-semibold text-gray-900">LKR {event.price.toLocaleString()}</span>
                        )}
                      </div>
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No events found</h3>
                <p className="text-gray-600">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
