"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MapPin,
  Save,
  Tag,
  Upload,
  Users,
  Trash2,
} from "lucide-react"

import { AuthGuard, useAuth } from "@/components/auth-guard"
import { LocationPicker } from "@/components/location-picker"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { mainCategories, getSubcategories } from "@/lib/constants/categories"
import {
  getEventByIdClient,
  updateEventClient,
  type EventWithProfile,
} from "@/lib/supabase/events.client"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"

type EditPageProps = {
  params: { id: string }
}

type FormState = {
  title: string
  description: string
  category: string
  subcategory: string
  date: string
  time: string
  venue: string
  address: string
  city: string
  ticketPrice: string
  maxAttendees: string
  contactEmail: string
  contactPhone: string
  websiteUrl: string
  posterImage: File | null
}

function EditEventContent({ eventId }: { eventId: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState<FormState | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [hasImageChanged, setHasImageChanged] = useState(false)

  const primeForm = useCallback((event: EventWithProfile & { subcategory?: string | null }) => {
    setFormData({
      title: event.title ?? "",
      description: event.description ?? "",
      category: event.category ?? "",
      subcategory: event.subcategory ?? "",
      date: event.date ? event.date.slice(0, 10) : "",
      time: event.time ?? "",
      venue: event.venue ?? "",
      address: event.address ?? "",
      city: event.city ?? event.location ?? "",
      ticketPrice: event.price != null ? String(event.price) : "",
      maxAttendees: event.max_attendees != null ? String(event.max_attendees) : "",
      contactEmail: event.contact_email ?? user?.email ?? "",
      contactPhone: event.contact_phone ?? "",
      websiteUrl: event.website_url ?? "",
      posterImage: null,
    })

    if (event.latitude != null && event.longitude != null) {
      setSelectedLocation({ lat: Number(event.latitude), lng: Number(event.longitude) })
    } else {
      setSelectedLocation(null)
    }

    setImagePreview(event.image_url ?? null)
    setHasImageChanged(false)
  }, [user?.email])

  const loadEvent = useCallback(async () => {
    if (!eventId || authLoading) return
    setLoadingEvent(true)
    setErrorMessage(null)

    try {
      const event = await getEventByIdClient(eventId)
      if (!event) {
        setErrorMessage("We couldn't find this event. It may have been removed.")
        return
      }

      if (user && event.user_id && event.user_id !== user.id) {
        setErrorMessage("You can only edit events that you created.")
        return
      }

      primeForm(event)
    } catch (error) {
      console.error("Failed to load event for editing", error)
      setErrorMessage("Something went wrong while loading the event.")
    } finally {
      setLoadingEvent(false)
    }
  }, [eventId, user, authLoading, primeForm])

  useEffect(() => {
    loadEvent()
  }, [loadEvent])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            [name]: value,
            ...(name === "category" ? { subcategory: "" } : {}),
          }
        : prev,
    )
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    setFormData((prev) => (prev ? { ...prev, posterImage: file } : prev))
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview((event.target?.result as string) ?? null)
      setHasImageChanged(true)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setFormData((prev) => (prev ? { ...prev, posterImage: null } : prev))
    setImagePreview(null)
    setHasImageChanged(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData || !user?.id) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const price = formData.ticketPrice ? Number(formData.ticketPrice) : 0
      const maxAttendees = formData.maxAttendees ? Number(formData.maxAttendees) : null

      const updates: Partial<EventWithProfile> & { subcategory?: string | null } = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || null,
        date: formData.date,
        time: formData.time,
        venue: formData.venue,
        address: formData.address,
        city: formData.city,
        location: formData.city,
        price,
        max_attendees: maxAttendees,
        website_url: formData.websiteUrl || null,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone || null,
        latitude: selectedLocation?.lat ?? null,
        longitude: selectedLocation?.lng ?? null,
      }

      if (hasImageChanged) {
        updates.image_url = imagePreview
      }

      await updateEventClient(eventId, updates)

      alert("Your event was updated successfully.")

      router.push(`/events/${eventId}`)
    } catch (error) {
      console.error("Failed to update event", error)
      setErrorMessage("We couldn't save your changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loadingEvent) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-center">
        <p className="text-sm text-gray-600">{errorMessage}</p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline">Back to dashboard</Button>
          </Link>
          <Link href={`/events/${eventId}`}>
            <Button>View event</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (!formData) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      <header className="border-b border-sky-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-gray-600 transition hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-lg font-semibold text-gray-900">Update event</h1>
              </div>
            </div>
            <Link href={`/events/${eventId}`} className="text-sm text-sky-600 hover:underline">
              View live event
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Tag className="h-4 w-4 text-sky-500" />
                  Basic details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Event title *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter event title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    required
                    placeholder="Describe what attendees can expect..."
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <select
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Select a category</option>
                      {mainCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  {formData.category && getSubcategories(formData.category).length > 0 && (
                    <div>
                      <Label htmlFor="subcategory">Subcategory</Label>
                      <select
                        id="subcategory"
                        name="subcategory"
                        value={formData.subcategory}
                        onChange={handleInputChange}
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        <option value="">Select a subcategory</option>
                        {getSubcategories(formData.category).map((subcategory) => (
                          <option key={subcategory} value={subcategory}>
                            {subcategory}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Calendar className="h-4 w-4 text-sky-500" />
                  Date & time
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="date">Event date *</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="time">Start time *</Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <MapPin className="h-4 w-4 text-sky-500" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="venue">Venue *</Label>
                  <Input
                    id="venue"
                    name="venue"
                    value={formData.venue}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="">Select a city</option>
                    <option value="Colombo">Colombo</option>
                    <option value="Kandy">Kandy</option>
                    <option value="Galle">Galle</option>
                    <option value="Negombo">Negombo</option>
                    <option value="Jaffna">Jaffna</option>
                    <option value="Matara">Matara</option>
                    <option value="Anuradhapura">Anuradhapura</option>
                    <option value="Polonnaruwa">Polonnaruwa</option>
                    <option value="Batticaloa">Batticaloa</option>
                    <option value="Trincomalee">Trincomalee</option>
                  </select>
                </div>
                <div>
                  <Label className="block text-sm text-gray-700">Pin exact location (optional)</Label>
                  <LocationPicker value={selectedLocation} onChange={setSelectedLocation} className="mt-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Users className="h-4 w-4 text-sky-500" />
                  Additional details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="ticketPrice">Ticket price (LKR)</Label>
                    <Input
                      id="ticketPrice"
                      name="ticketPrice"
                      type="number"
                      value={formData.ticketPrice}
                      onChange={handleInputChange}
                      min={0}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxAttendees">Max attendees</Label>
                    <Input
                      id="maxAttendees"
                      name="maxAttendees"
                      type="number"
                      value={formData.maxAttendees}
                      onChange={handleInputChange}
                      min={0}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Event website or social link</Label>
                  <Input
                    id="websiteUrl"
                    name="websiteUrl"
                    type="url"
                    value={formData.websiteUrl}
                    onChange={handleInputChange}
                    placeholder="https://"
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Contact</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="contactEmail">Contact email *</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contactPhone">Contact phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Upload className="h-4 w-4 text-sky-500" />
                  Event poster
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-4 text-center">
                  {imagePreview ? (
                    <div className="space-y-4">
                      <Image
                        src={imagePreview}
                        alt="Poster preview"
                        width={400}
                        height={192}
                        className="h-48 w-full rounded-md object-cover"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Label
                          htmlFor="poster-upload"
                          className="inline-flex w-full cursor-pointer items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                        >
                          Change image
                        </Label>
                        <Button type="button" variant="outline" onClick={handleRemoveImage} className="w-full">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Upload className="mx-auto h-10 w-10 text-gray-400" />
                      <p className="text-sm text-gray-600">Upload a banner to help your event stand out.</p>
                      <Label
                        htmlFor="poster-upload"
                        className="inline-flex cursor-pointer items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        Choose image
                      </Label>
                    </div>
                  )}
                  <Input
                    id="poster-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">{formData.title || "Event title"}</h3>
                {formData.date && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="mr-2 h-4 w-4 text-sky-500" />
                    {new Date(formData.date).toLocaleDateString()} {formData.time && `at ${formData.time}`}
                  </div>
                )}
                {formData.venue && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="mr-2 h-4 w-4 text-sky-500" />
                    {formData.venue}
                    {formData.city ? ` • ${formData.city}` : ""}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {formData.category && (
                    <span className="inline-flex items-center rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                      {formData.category}
                    </span>
                  )}
                  {formData.subcategory && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-800">
                      {formData.subcategory}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={isSaving || isDeleting}
                className="flex w-full items-center justify-center gap-2 bg-sky-600 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving changes
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Update event
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isDeleting || isSaving}
                onClick={async () => {
                  if (!user?.id) return
                  if (!confirm("Delete this event? This action cannot be undone.")) {
                    return
                  }

                  try {
                    setIsDeleting(true)
                    const supabase = createClient()
                    const { error } = await supabase
                      .from("events")
                      .delete()
                      .eq("id", eventId)
                      .eq("user_id", user.id)

                    if (error) {
                      throw error
                    }

                    alert("Your event has been deleted.")
                    router.push("/dashboard")
                  } catch (error) {
                    console.error("Failed to delete event", error)
                    alert("We couldn't delete this event. Please try again.")
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                className="flex w-full items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" /> Delete event
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function EditEventPage({ params }: EditPageProps) {
  return (
    <AuthGuard requireAuth>
      <EditEventContent eventId={params.id} />
    </AuthGuard>
  )
}
