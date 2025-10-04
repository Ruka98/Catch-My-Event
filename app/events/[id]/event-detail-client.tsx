"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  Calendar,
  MapPin,
  User,
  Star,
  Heart,
  Users,
  MessageCircle,
  Share2,
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  Clock,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { toggleEventAttendance } from "@/lib/supabase/events.client"
import { cn } from "@/lib/utils"

interface Comment {
  id: string
  content: string
  created_at: string
  profiles: {
    display_name: string
    avatar_url?: string
  }
}

interface Attendee {
  status: string
  profiles: {
    display_name: string
    avatar_url?: string
  }
}

interface EventDetailClientProps {
  event: any
  comments: Comment[]
  attendees: Attendee[]
  user: SupabaseUser | null
  userAttendance: string | null
  userRating: number | null
  averageRating: number
  totalRatings: number
}

export function EventDetailClient({
  event,
  comments: initialComments,
  attendees: initialAttendees,
  user,
  userAttendance: initialUserAttendance,
  userRating: initialUserRating,
  averageRating,
  totalRatings,
}: EventDetailClientProps) {
  const [comments, setComments] = useState(initialComments)
  const [attendees, setAttendees] = useState(initialAttendees)
  const [userAttendance, setUserAttendance] = useState(initialUserAttendance)
  const [userRating, setUserRating] = useState(initialUserRating)
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false)
  const supabase = createClient()

  const handleAttendanceChange = async (action: "interested" | "attending") => {
    if (!user || isUpdatingAttendance) return

    setIsUpdatingAttendance(true)
    try {
      const currentStatus = userAttendance ?? "not_attending"
      const currentlyInterested = currentStatus === "interested" || currentStatus === "both"
      const currentlyAttending = currentStatus === "attending" || currentStatus === "both"

      let nextInterested = currentlyInterested
      let nextAttending = currentlyAttending

      if (action === "interested") {
        nextInterested = !currentlyInterested
      } else if (action === "attending") {
        nextAttending = !currentlyAttending
      }

      const nextStatus =
        nextInterested && nextAttending
          ? "both"
          : nextInterested
            ? "interested"
            : nextAttending
              ? "attending"
              : "not_attending"

      await toggleEventAttendance(event.id, user.id, action)
      setUserAttendance(nextStatus === "not_attending" ? null : nextStatus)

      const { data: updatedAttendees } = await supabase
        .from("event_attendees")
        .select("status, profiles!event_attendees_user_id_fkey(display_name, avatar_url)")
        .eq("event_id", event.id)

      if (updatedAttendees) {
        setAttendees(updatedAttendees as Attendee[])
      }
    } catch (error) {
      console.error("Error updating attendance:", error)
    } finally {
      setIsUpdatingAttendance(false)
    }
  }

  const handleRating = async (rating: number) => {
    if (!user) return

    try {
      const { error } = await supabase.from("user_event_ratings").upsert({
        event_id: event.id,
        user_id: user.id,
        rating: rating,
      })

      if (error) throw error
      setUserRating(rating)
    } catch (error) {
      console.error("Error rating event:", error)
    }
  }

  const handleCommentSubmit = async () => {
    if (!user || !newComment.trim() || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          event_id: event.id,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select(`
          *,
          profiles!comments_user_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      if (data) {
        setComments([data, ...comments])
        setNewComment("")
      }
    } catch (error) {
      console.error("Error posting comment:", error)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const attendingCount = attendees.filter((a) => a.status === "attending" || a.status === "both").length
  const interestedCount = attendees.filter((a) => a.status === "interested" || a.status === "both").length
  const isGoing = userAttendance === "attending" || userAttendance === "both"
  const isInterested = userAttendance === "interested" || userAttendance === "both"

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-sky-200 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
            </Link>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="px-2 bg-transparent">
                <Share2 className="w-4 h-4" />
              </Button>
              {user && (
                <Link href="/profile">
                  <Button variant="outline" size="sm" className="px-2 bg-transparent">
                    <User className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 py-4">
        <div className="space-y-6">
          {/* Event Header */}
          <Card className="border-sky-200">
            <div className="relative">
              <img
                src={
                  event.image_url || `/placeholder.svg?height=300&width=600&query=${encodeURIComponent(event.title)}`
                }
                alt={event.title}
                className="w-full h-48 object-cover rounded-t-lg"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-sky-500 hover:bg-sky-700 text-xs">{event.category}</Badge>
                {event.featured && (
                  <Badge className="bg-yellow-500 hover:bg-yellow-600 text-xs">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {event.price === 0 && <Badge className="bg-green-500 hover:bg-green-600 text-xs">Free</Badge>}
              </div>
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl font-bold text-gray-900 leading-tight">{event.title}</CardTitle>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-sky-600" />
                  {new Date(event.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-sky-600" />
                  {event.time}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-sky-600" />
                  {event.venue}, {event.location}
                </div>
                {averageRating > 0 && (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-500 fill-current" />
                    <span className="font-medium">{averageRating.toFixed(1)}</span>
                    <span className="text-gray-500 ml-1">({totalRatings} reviews)</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-4 text-sm">{event.description}</p>

              <div className="space-y-3 mb-4">
                {event.address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Address</p>
                      <p className="text-gray-600 text-sm">{event.address}</p>
                    </div>
                  </div>
                )}
                {event.contact_phone && (
                  <div className="flex items-start space-x-2">
                    <Phone className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Phone</p>
                      <a href={`tel:${event.contact_phone}`} className="text-sky-700 hover:text-sky-800 text-sm">
                        {event.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
                {event.contact_email && (
                  <div className="flex items-start space-x-2">
                    <Mail className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Email</p>
                      <a href={`mailto:${event.contact_email}`} className="text-sky-700 hover:text-sky-800 text-sm">
                        {event.contact_email}
                      </a>
                    </div>
                  </div>
                )}
                {event.website_url && (
                  <div className="flex items-start space-x-2">
                    <Globe className="w-4 h-4 mt-0.5 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">Website</p>
                      <a
                        href={event.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-700 hover:text-sky-800 text-sm"
                      >
                        Visit Website
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="mb-4">
                <p className="text-xl font-bold text-gray-900">
                  {event.price === 0 ? (
                    <span className="text-green-600">Free Event</span>
                  ) : (
                    <span>LKR {event.price.toLocaleString()}</span>
                  )}
                </p>
                {event.max_attendees && (
                  <p className="text-gray-600 text-sm">Limited to {event.max_attendees} attendees</p>
                )}
              </div>

              {user ? (
                <div className="space-y-3">
                  {/* Attendance Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAttendanceChange("attending")}
                      disabled={isUpdatingAttendance}
                      className={cn(
                        "flex-1 text-sm text-white transition",
                        isGoing ? "bg-sky-700 hover:bg-sky-700" : "bg-sky-600 hover:bg-sky-700",
                      )}
                      size="sm"
                      aria-pressed={isGoing}
                    >
                      <Users className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isGoing ? "Attending" : "Attend"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAttendanceChange("interested")}
                      disabled={isUpdatingAttendance}
                      className={cn(
                        "flex-1 text-sm transition",
                        isInterested ? "border-sky-300 bg-sky-100 text-sky-800" : "border-sky-200 hover:bg-sky-50",
                      )}
                      size="sm"
                      aria-pressed={isInterested}
                    >
                      <Heart className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isInterested ? "Interested" : "Interest"}
                    </Button>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Rate:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleRating(rating)}
                          className={`p-1 rounded ${
                            userRating && rating <= userRating
                              ? "text-yellow-500"
                              : "text-gray-300 hover:text-yellow-400"
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3">
                  <p className="text-sky-800 mb-2 text-sm">Sign in to interact with this event</p>
                  <div className="flex gap-2">
                    <Link href="/auth/login" className="flex-1">
                      <Button size="sm" className="bg-sky-500 hover:bg-sky-700 w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link href="/auth/signup" className="flex-1">
                      <Button size="sm" variant="outline" className="border-sky-200 bg-transparent w-full">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {/* Event Organizer */}
            <Card className="border-sky-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Event Organizer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={(event.profile_id !== null && event.profiles?.avatar_url) || "/placeholder.svg"}
                    />
                    <AvatarFallback>
                      {event.profile_id === null
                        ? "A"
                        : (event.profiles?.display_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {event.profile_id === null ? "Anonymous" : event.profiles?.display_name || "Organizer"}
                    </p>
                    {event.profile_id !== null && event.profiles && (
                      <div className="flex items-center">
                        <Star className="w-3 h-3 text-yellow-500 mr-1" />
                        <span className="text-xs text-gray-600">{event.profiles.reputation_score} reputation</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Stats */}
            <Card className="border-sky-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Who&apos;s Going</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">{attendingCount}</p>
                    <p className="text-xs text-gray-600">Attending</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sky-700">{interestedCount}</p>
                    <p className="text-xs text-gray-600">Interested</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{event.views || 0}</p>
                    <p className="text-xs text-gray-600">Views</p>
                  </div>
                </div>

                {/* Show some attendees */}
                {attendees.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Recent attendees:</p>
                    <div className="flex justify-center -space-x-2">
                      {attendees.slice(0, 5).map((attendee, index) => (
                        <Avatar key={index} className="w-8 h-8 border-2 border-white">
                          <AvatarImage src={attendee.profiles.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback className="text-xs">
                            {attendee.profiles.display_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {attendees.length > 5 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                          <span className="text-xs text-gray-600">+{attendees.length - 5}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comments Section */}
          <Card className="border-sky-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <MessageCircle className="w-4 h-4 mr-2 text-sky-600" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add Comment */}
              {user ? (
                <div className="mb-4">
                  <Textarea
                    placeholder="Share your thoughts..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-3 border-sky-200 focus:border-sky-500 text-sm"
                    rows={3}
                  />
                  <Button
                    onClick={handleCommentSubmit}
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="bg-sky-500 hover:bg-sky-700 w-full"
                    size="sm"
                  >
                    {isSubmittingComment ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    <Link href="/auth/login" className="text-sky-700 hover:text-sky-800 underline">
                      Sign in
                    </Link>{" "}
                    to join the conversation
                  </p>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={comment.profiles.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="text-xs">
                        {comment.profiles.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="font-medium text-gray-900 text-sm">{comment.profiles.display_name}</p>
                        <p className="text-xs text-gray-500">{new Date(comment.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-gray-500 py-6 text-sm">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Similar Events */}
          <Card className="border-sky-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Similar Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Discover more {event.category.toLowerCase()} events in {event.location}
              </p>
              <Link href={`/?category=${event.category}&location=${event.location}`}>
                <Button variant="outline" size="sm" className="w-full border-sky-200 hover:bg-sky-50 bg-transparent">
                  Browse Similar Events
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
