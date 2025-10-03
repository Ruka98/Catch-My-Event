// page.tsx - Updated form with improved map spacing for mobile
"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, Upload, ArrowLeft, Users, Tag } from "lucide-react"
import Link from "next/link"
import { AuthGuard, useAuth } from "@/components/auth-guard"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LocationPicker } from "@/components/location-picker"
import { mainCategories, getSubcategories } from "@/lib/constants/categories"
import { SocialTopNav } from "@/components/navigation/social-top-nav"

function PostEventContent() {
  const { user } = useAuth()
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
    contactEmail: user?.email || "",
    contactPhone: "",
    websiteUrl: "",
    posterImage: null as File | null,
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "category" ? { subcategory: "" } : {}),
    }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData((prev) => ({ ...prev, posterImage: file }))
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLocationChange = (location: { lat: number; lng: number } | null) => {
    setSelectedLocation(location)
    if (location) {
      setLocationError("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate location
    if (!selectedLocation) {
      setLocationError("Please select a location on the map")
      return
    }

    setIsSubmitting(true)

    try {
      if (!user?.id) {
        alert("Please sign in again to post your event.")
        return
      }

      const supabase = createClient()

      const price = formData.ticketPrice ? Number(formData.ticketPrice) : 0
      const maxAttendees = formData.maxAttendees ? Number(formData.maxAttendees) : null

      let imageUrl = null;
      if (formData.posterImage) {
        const file = formData.posterImage;
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("event-posters")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
          throw new Error("Failed to upload event poster.");
        }

        const { data: publicUrlData } = supabase.storage
          .from("event-posters")
          .getPublicUrl(uploadData.path);

        imageUrl = publicUrlData.publicUrl;
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
        location: "Selected on map", // No longer using district
        city: "Selected on map",
        address: "Selected on map",
        price,
        max_attendees: maxAttendees,
        website_url: formData.websiteUrl || null,
        contact_email: formData.contactEmail,
        contact_phone: formData.contactPhone || null,
        image_url: imageUrl,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        status: "published" as const,
        user_id: user.id,
        profile_id: user.id,
      }

      const { data, error } = await supabase.from("events").insert(payload).select("id").single()

      if (error) {
        throw error
      }

      alert("Event posted successfully! It's now live on the platform.")

      if (data?.id) {
        router.push(`/events/${data.id}`)
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error("[v0] Error creating event:", error)
      alert("There was an error posting your event. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <SocialTopNav active="profile" />
      <main className="mx-auto max-w-4xl space-y-8 px-4 pb-16 pt-6">
        <section className="space-y-6 rounded-3xl border border-sky-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Create Event</h1>
              <p className="text-sm text-gray-600 sm:text-base">Fill in the event details below.</p>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full border-sky-200 text-sky-700 hover:bg-sky-50 bg-transparent"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
        </section>

        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Tag className="w-5 h-5 text-sky-500" />
                      <span>Basic Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="title">Event Title *</Label>
                      <Input
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter your event title"
                        required
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
                        placeholder="Describe your event..."
                        rows={4}
                        required
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <select
                          id="category"
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400"
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
                          <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                          <select
                            id="subcategory"
                            name="subcategory"
                            value={formData.subcategory}
                            onChange={handleInputChange}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400"
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

                {/* Date & Time */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-sky-500" />
                      <span>Date & Time</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="date">Start Date *</Label>
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
                        <Label htmlFor="endDate">End Date (Optional)</Label>
                        <Input
                          id="endDate"
                          name="endDate"
                          type="date"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          min={formData.date}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">For multi-day events like carnivals</p>
                      </div>
                      <div>
                        <Label htmlFor="time">Start Time *</Label>
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
                    </div>
                  </CardContent>
                </Card>

                {/* Location */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="w-5 h-5 text-sky-500" />
                      <span>Location *</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="venue">Address *</Label>
                      <Input
                        id="venue"
                        name="venue"
                        value={formData.venue}
                        onChange={handleInputChange}
                        placeholder=""
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="mb-2 block text-sm text-gray-700">
                        Pin exact location on map *
                        {locationError && (
                          <span className="text-red-500 ml-2">{locationError}</span>
                        )}
                      </Label>
                      <div className="mt-2 rounded-lg overflow-hidden border border-gray-300">
                        <LocationPicker 
                          value={selectedLocation} 
                          onChange={handleLocationChange} 
                          className="w-full h-64 sm:h-80 md:h-96" 
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Click the marker tool, then tap the map or drag the marker icon onto the exact venue location
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5 text-sky-500" />
                      <span>Additional Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ticketPrice">Ticket Price (LKR)</Label>
                        <Input
                          id="ticketPrice"
                          name="ticketPrice"
                          type="number"
                          value={formData.ticketPrice}
                          onChange={handleInputChange}
                          placeholder="0 for free events"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxAttendees">Max Attendees</Label>
                        <Input
                          id="maxAttendees"
                          name="maxAttendees"
                          type="number"
                          value={formData.maxAttendees}
                          onChange={handleInputChange}
                          placeholder="Leave empty for unlimited"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="websiteUrl">Event Website/Social Media</Label>
                      <Input
                        id="websiteUrl"
                        name="websiteUrl"
                        type="url"
                        value={formData.websiteUrl}
                        onChange={handleInputChange}
                        placeholder="https://..."
                        className="mt-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contactEmail">Contact Email *</Label>
                        <Input
                          id="contactEmail"
                          name="contactEmail"
                          type="email"
                          value={formData.contactEmail}
                          onChange={handleInputChange}
                          placeholder="your@email.com"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contactPhone">Contact Phone</Label>
                        <Input
                          id="contactPhone"
                          name="contactPhone"
                          type="tel"
                          value={formData.contactPhone}
                          onChange={handleInputChange}
                          placeholder="+94 XX XXX XXXX"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Image Upload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Upload className="w-5 h-5 text-sky-500" />
                      <span>Event Poster</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-sky-200 rounded-lg p-6 text-center">
                        {imagePreview ? (
                          <div className="space-y-4">
                            <img
                              src={imagePreview || "/placeholder.svg"}
                              alt="Preview"
                              className="w-full h-48 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setImagePreview(null)
                                setFormData((prev) => ({ ...prev, posterImage: null }))
                              }}
                            >
                              Remove Image
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                            <div>
                              <p className="text-sm text-gray-600">Upload your event poster</p>
                              <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                            </div>
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="poster-upload"
                            />
                            <Label
                              htmlFor="poster-upload"
                              className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                              Choose File
                            </Label>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-900">{formData.title || "Your Event Title"}</h3>
                      {formData.date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2 text-sky-500" />
                          {formData.endDate && formData.endDate !== formData.date
                            ? `${new Date(formData.date).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
                            : new Date(formData.date).toLocaleDateString()}{" "}
                          {formData.time && `at ${formData.time}`}
                        </div>
                      )}
                      {formData.venue && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="w-4 h-4 mr-2 text-sky-500" />
                          {formData.venue}
                          {selectedLocation && (
                            <span className="ml-1 text-xs text-gray-500">
                              ({selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)})
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {formData.category && (
                          <span className="inline-block px-2 py-1 rounded-full border border-sky-200 bg-sky-50 text-sky-700 text-xs">
                            {formData.category}
                          </span>
                        )}
                        {formData.subcategory && (
                          <span className="inline-block px-2 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs">
                            {formData.subcategory}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedLocation}
                  className="w-full bg-sky-600 hover:bg-sky-700 text-white py-3"
                >
                  {isSubmitting ? "Posting Event..." : "Post Event"}
                </Button>
                {!selectedLocation && (
                  <p className="text-sm text-red-500 text-center">
                    Please select a location on the map to post your event
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

export default function Page() {
  return (
    <AuthGuard requireAuth>
      <PostEventContent />
    </AuthGuard>
  )
}
