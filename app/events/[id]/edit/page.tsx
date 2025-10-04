"use client"

import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Upload, ArrowLeft, Users, Tag, Trash2, Loader2, Save } from "lucide-react"
import Link from "next/link"
import { AuthGuard, useAuth } from "@/components/auth-guard"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import DynamicLocationPicker from "@/components/dynamic-location-picker"
import { mainCategories, getSubcategories } from "@/lib/constants/categories"
import { SocialTopNav } from "@/components/navigation/social-top-nav"
import { getEventByIdClient, type EventWithProfile } from "@/lib/supabase/events.client"

type EditPageProps = {
  params: { id: string }
}

function EditEventContent({ eventId }: { eventId: string }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    date: "",
    endDate: "",
    time: "",
    venue: "",
    ticketPrice: "",
    maxAttendees: "",
    contactEmail: "",
    contactPhone: "",
    websiteUrl: "",
    posterImage: null as File | null,
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState("")
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
      endDate: event.end_date ? event.end_date.slice(0, 10) : "",
      time: event.time ?? "",
      venue: event.venue ?? "",
      ticketPrice: event.price != null ? String(event.price) : "",
      maxAttendees: event.max_attendees != null ? String(event.max_attendees) : "",
      contactEmail: event.contact_email ?? "",
      contactPhone: event.contact_phone ?? "",
      websiteUrl: event.website_url ?? "",
      posterImage: null,
    })
    if (event.latitude != null && event.longitude != null) {
      setSelectedLocation({ lat: Number(event.latitude), lng: Number(event.longitude) })
    }
    setImagePreview(event.image_url ?? null)
    setHasImageChanged(false)
  }, [])

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value, ...(name === "category" ? { subcategory: "" } : {}) }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, posterImage: file }))
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
        setHasImageChanged(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLocationChange = async (location: { lat: number; lng: number } | null) => {
    setSelectedLocation(location)
    if (location) {
      setLocationError("")
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}`,
        )
        const data = await response.json()
        if (data.display_name) {
          setFormData((prev) => ({ ...prev, venue: data.display_name }))
        }
      } catch (error) {
        console.error("Error fetching address:", error)
        // Do not clear venue on error in edit mode, just log it
      }
    }
  }

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, posterImage: null }))
    setImagePreview(null)
    setHasImageChanged(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLocation) {
      setLocationError("Please select a location on the map")
      return
    }
    if (!user?.id) {
      alert("Please sign in again to update your event.")
      return
    }
    setIsSaving(true)
    try {
      const supabase = createClient()
      const price = formData.ticketPrice ? Number(formData.ticketPrice) : 0
      const maxAttendees = formData.maxAttendees ? Number(formData.maxAttendees) : null
      let imageUrl = imagePreview
      if (hasImageChanged && formData.posterImage) {
        const file = formData.posterImage
        const fileName = `${user.id}/${Date.now()}_${file.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage.from("event-posters").upload(fileName, file)
        if (uploadError) throw new Error("Failed to upload new event poster.")
        const { data: publicUrlData } = supabase.storage.from("event-posters").getPublicUrl(uploadData.path)
        imageUrl = publicUrlData.publicUrl
      } else if (hasImageChanged && !imagePreview) {
        imageUrl = null
      }
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        subcategory: formData.subcategory || null,
        date: formData.date,
        end_date: formData.endDate || formData.date,
        time: formData.time,
        venue: formData.venue,
        price,
        max_attendees: maxAttendees,
        website_url: formData.websiteUrl || null,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone || null,
        image_url: imageUrl,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
      }
      const { error } = await supabase.from("events").update(payload).eq("id", eventId)
      if (error) throw error
      alert("Event updated successfully!")
      router.push(`/events/${eventId}`)
    } catch (error) {
      console.error("[v0] Error updating event:", error)
      alert("There was an error updating your event. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.id || !confirm("Are you sure you want to delete this event? This action cannot be undone.")) return
    setIsDeleting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from("events").delete().eq("id", eventId).eq("user_id", user.id)
      if (error) throw error
      alert("Event has been deleted.")
      router.push("/profile")
    } catch (error) {
      console.error("Failed to delete event", error)
      alert("We couldn't delete this event. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (loadingEvent) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-sky-500" /></div>
  }
  if (errorMessage) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-center">
        <p className="text-sm text-gray-600">{errorMessage}</p>
        <Button asChild variant="outline"><Link href="/profile">Back to profile</Link></Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <SocialTopNav active="profile" />
      <main className="mx-auto max-w-4xl space-y-8 px-4 pb-16 pt-6">
        <section className="space-y-6 rounded-3xl border border-sky-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Edit Event</h1>
              <p className="text-sm text-gray-600 sm:text-base">Update the details for your event.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="rounded-full border-sky-200 text-sky-700 hover:bg-sky-50 bg-transparent">
              <Link href={`/events/${eventId}`} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Event
              </Link>
            </Button>
          </div>
        </section>
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center space-x-2"><Tag className="w-5 h-5 text-sky-500" /><span>Basic Information</span></CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Event Title *</Label>
                      <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Enter your event title" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Textarea id="description" name="description" value={formData.description} onChange={handleInputChange} placeholder="Describe your event..." rows={4} required className="mt-1" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <select id="category" name="category" value={formData.category} onChange={handleInputChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400">
                          <option value="">Select a category</option>
                          {mainCategories.map((c) => (<option key={c} value={c}>{c}</option>))}
                        </select>
                      </div>
                      {formData.category && getSubcategories(formData.category).length > 0 && (
                        <div>
                          <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                          <select id="subcategory" name="subcategory" value={formData.subcategory} onChange={handleInputChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400">
                            <option value="">Select a subcategory</option>
                            {getSubcategories(formData.category).map((s) => (<option key={s} value={s}>{s}</option>))}
                          </select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center space-x-2"><Calendar className="w-5 h-5 text-sky-500" /><span>Date & Time</span></CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="date">Start Date *</Label>
                        <Input id="date" name="date" type="date" value={formData.date} onChange={handleInputChange} required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="endDate">End Date (Optional)</Label>
                        <Input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} min={formData.date} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="time">Start Time *</Label>
                        <Input id="time" name="time" type="time" value={formData.time} onChange={handleInputChange} required className="mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center space-x-2"><MapPin className="w-5 h-5 text-sky-500" /><span>Location *</span></CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block text-sm text-gray-700">
                        Pin Exact Location on Map *
                        {locationError && <span className="ml-2 text-red-500">{locationError}</span>}
                      </Label>
                      <DynamicLocationPicker value={selectedLocation} onChange={handleLocationChange} />
                    </div>
                    <div className="mt-4">
                      <Label htmlFor="venue">Address / Venue Name *</Label>
                      <Input
                        id="venue"
                        name="venue"
                        value={formData.venue}
                        onChange={handleInputChange}
                        placeholder="Address is auto-filled from map. You can refine it here."
                        required
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center space-x-2"><Users className="w-5 h-5 text-sky-500" /><span>Additional Details</span></CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ticketPrice">Ticket Price (LKR)</Label>
                        <Input id="ticketPrice" name="ticketPrice" type="number" value={formData.ticketPrice} onChange={handleInputChange} placeholder="0 for free events" className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="maxAttendees">Max Attendees</Label>
                        <Input id="maxAttendees" name="maxAttendees" type="number" value={formData.maxAttendees} onChange={handleInputChange} placeholder="Leave empty for unlimited" className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="websiteUrl">Event Website/Social Media</Label>
                      <Input id="websiteUrl" name="websiteUrl" type="url" value={formData.websiteUrl} onChange={handleInputChange} placeholder="https://..." className="mt-1" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactEmail">Contact Email *</Label>
                        <Input id="contactEmail" name="contactEmail" type="email" value={formData.contactEmail} onChange={handleInputChange} placeholder="your@email.com" required className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="contactPhone">Contact Phone</Label>
                        <Input id="contactPhone" name="contactPhone" type="tel" value={formData.contactPhone} onChange={handleInputChange} placeholder="+94 XX XXX XXXX" className="mt-1" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center space-x-2"><Upload className="w-5 h-5 text-sky-500" /><span>Event Poster</span></CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-sky-200 rounded-lg p-6 text-center">
                        {imagePreview ? (
                          <div className="space-y-4">
                            <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Label htmlFor="poster-upload" className="cursor-pointer inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Change File</Label>
                              <Button type="button" variant="outline" onClick={handleRemoveImage} className="w-full">Remove Image</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                            <div>
                              <p className="text-sm text-gray-600">Upload your event poster</p>
                              <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                            </div>
                            <Label htmlFor="poster-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Choose File</Label>
                          </div>
                        )}
                        <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="poster-upload" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-3">
                  <Button type="submit" disabled={isSaving || isDeleting || !selectedLocation} className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3 flex items-center gap-2">
                    {isSaving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>) : (<><Save className="h-4 w-4" /> Update Event</>)}
                  </Button>
                  {!selectedLocation && <p className="text-sm text-red-500 text-center">Please select a location to update your event</p>}
                  <Button type="button" variant="destructive" disabled={isDeleting || isSaving} onClick={handleDelete} className="w-full flex items-center gap-2">
                    {isDeleting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Deleting...</>) : (<><Trash2 className="h-4 w-4" /> Delete Event</>)}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function Page({ params }: EditPageProps) {
  return (
    <AuthGuard requireAuth>
      <EditEventContent eventId={params.id} />
    </AuthGuard>
  )
}