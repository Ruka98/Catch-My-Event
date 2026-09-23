"use client"

import { useState, useCallback, useMemo } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Heart, MapPin, MessageCircle, Share2, Users, Edit, Trash2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { getAttendanceCounts, getAttendanceLabel } from "@/lib/eventAttendance"
import { createClient } from "@/lib/supabase/client"
import {
  updateEventViews,
  toggleEventAttendance,
  toggleEventLike,
  type EventWithProfile,
} from "@/lib/supabase/events.client"
import type { EventWithCounts } from "@/lib/supabase/types"
import type { User } from "@supabase/supabase-js"
import { slugifyVenue } from "@/lib/venues/venue-helper"

type FeedComment = {
  id: string
  content: string
  created_at: string
  profiles: { display_name: string; avatar_url?: string | null } | null
}

function isEventWithCounts(event: EventWithProfile | EventWithCounts): event is EventWithCounts {
  return "attendee_count" in event && "user_is_attending" in event
}

type EventCardProps = {
  event: EventWithProfile | EventWithCounts
  user: User | null
  onUpdate: () => void
  onQuickView?: (event: EventWithProfile | EventWithCounts) => void
}

export function EventCard({ event, user, onUpdate, onQuickView }: EventCardProps) {
  const { toast } = useToast()
  const supabaseClient = useMemo(() => createClient(), [])

  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [comments, setComments] = useState<FeedComment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)
  const [commentInput, setCommentInput] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // optimistic state
  const [optimisticLikes, setOptimisticLikes] = useState(event.like_count ?? 0)
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(event.user_has_liked ?? false)

  const initialAttending = isEventWithCounts(event)
    ? event.user_is_attending
    : event.event_attendees?.some((a) => a.user_id === user?.id && a.status === "attending") ?? false

  const initialAttendeeCount = isEventWithCounts(event)
    ? event.attendee_count
    : getAttendanceCounts(event).attending

  const [optimisticAttending, setOptimisticAttending] = useState(initialAttending)
  const [optimisticAttendeeCount, setOptimisticAttendeeCount] = useState(initialAttendeeCount)

  const isGoing = optimisticAttending
  const isOwner = user?.id === event.user_id
  const attendanceLabel = getAttendanceLabel({ attending: optimisticAttendeeCount })

  const dateLabel = useMemo(() => {
    try {
      const d = new Date(event.date)
      if (isNaN(d.getTime())) return `${event.date}${event.time ? ` at ${event.time}` : ""}`
      const base = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      let dateText = base
      if (event.end_date && event.end_date !== event.date) {
        const endD = new Date(event.end_date)
        if (!isNaN(endD.getTime())) {
          dateText += ` – ${endD.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
        }
      }
      return `${dateText}${event.time ? ` • ${event.time}` : ""}`
    } catch {
      return `${event.date}${event.time ? ` at ${event.time}` : ""}`
    }
  }, [event.date, event.end_date, event.time])

  const fetchCommentsForEvent = useCallback(async () => {
    setIsLoadingComments(true)
    setCommentError(null)
    try {
      const { data, error } = await supabaseClient
        .from("comments")
        .select("id, content, created_at, profiles(display_name, avatar_url)")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false })
        .limit(25)
      if (error) throw error
      setComments((data as FeedComment[]) ?? [])
    } catch (e) {
      console.error(e)
      setCommentError("Unable to load comments right now.")
    } finally {
      setIsLoadingComments(false)
    }
  }, [supabaseClient, event.id])

  const handleToggleComments = useCallback(async () => {
    const next = !isCommentsOpen
    setIsCommentsOpen(next)
    if (next && comments.length === 0) fetchCommentsForEvent()
  }, [isCommentsOpen, comments.length, fetchCommentsForEvent])

  const handleCommentSubmit = useCallback(async () => {
    if (!user) {
      toast({ title: "Sign in to comment", description: "Create an account to join the conversation." })
      return
    }
    const content = commentInput.trim()
    if (!content) return
    setIsSubmittingComment(true)
    setCommentError(null)
    try {
      const { data, error } = await supabaseClient
        .from("comments")
        .insert({ event_id: event.id, user_id: user.id, content })
        .select("id, content, created_at, profiles(display_name, avatar_url)")
        .single()
      if (error) throw error
      if (data) {
        setComments((prev) => [data as FeedComment, ...prev])
        setCommentInput("")
      }
    } catch (e) {
      console.error(e)
      setCommentError("Could not post your comment. Please try again.")
    } finally {
      setIsSubmittingComment(false)
    }
  }, [commentInput, supabaseClient, toast, user, event.id])

  const handleShareEvent = useCallback(async () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    const shareUrl = `${baseUrl}/events/${event.id}`
    const shareText = event.description
      ? `${event.description.slice(0, 120)}${event.description.length > 120 ? "…" : ""}`
      : "Catch this event on Catch My Event"
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: event.title, text: shareText, url: shareUrl })
        toast({ title: "Event shared", description: "Thanks for spreading the word!" })
        return
      }
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast({ title: "Link copied", description: "Event link copied to your clipboard." })
        return
      }
      throw new Error("Sharing not supported")
    } catch (e: any) {
      if (e?.name === "AbortError") return
      console.error(e)
      toast({ title: "Unable to share", description: "Try copying the link instead.", variant: "destructive" })
    }
  }, [toast, event])

  const handleEventInteraction = async (action: "view" | "attending" | "like") => {
    if (action === "view") {
      try { await updateEventViews(event.id) } catch {}
      return
    }
    if (!user) {
      toast({ title: "Sign in to interact", description: "Log in to RSVP, comment, and share events." })
      return
    }
    if (action === "like") {
      const prevLiked = optimisticIsLiked
      const prevLikes = optimisticLikes
      setOptimisticIsLiked(!prevLiked)
      setOptimisticLikes(prevLikes + (!prevLiked ? 1 : -1))
      try { await toggleEventLike(event.id, user.id) } catch {
        setOptimisticIsLiked(prevLiked); setOptimisticLikes(prevLikes)
        toast({ title: "Error", description: "Could not update like status.", variant: "destructive" })
      }
    }
    if (action === "attending") {
      const prev = optimisticAttending
      const prevCnt = optimisticAttendeeCount
      setOptimisticAttending(!prev)
      setOptimisticAttendeeCount(prevCnt + (!prev ? 1 : -1))
      try { await toggleEventAttendance(event.id, user.id, "attending") } catch {
        setOptimisticAttending(prev); setOptimisticAttendeeCount(prevCnt)
        toast({ title: "Error", description: "Could not update attendance.", variant: "destructive" })
      }
    }
  }

  const handleDelete = async () => {
    if (!isOwner) return
    setIsDeleting(true)
    try {
      const { error } = await supabaseClient.from("events").delete().eq("id", event.id)
      if (error) throw error
      toast({ title: "Event Deleted", description: "Your event has been successfully deleted." })
      onUpdate()
    } catch (e: any) {
      console.error(e)
      toast({ title: "Error", description: e.message || "Failed to delete event.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const isCommentButtonDisabled =
    isSubmittingComment || (isLoadingComments && comments.length === 0) || !commentInput.trim()

  return (
    <Card className="overflow-hidden rounded-2xl border border-sky-100/90 bg-white shadow-xs transition-all hover:shadow-md">
      {/* Header: Event Title, Category, and User in top corner */}
      <div className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Event Title */}
            {onQuickView ? (
              <button
                type="button"
                onClick={() => onQuickView(event)}
                className="text-left block text-lg font-bold text-gray-900 hover:text-sky-700 leading-tight mb-1 cursor-pointer transition-colors"
              >
                {event.title}
              </button>
            ) : (
              <Link
                href={`/events/${event.id}`}
                className="block text-lg font-bold text-gray-900 hover:text-sky-700 leading-tight mb-1"
              >
                {event.title}
              </Link>
            )}
            
            {/* Categories */}
            <div className="flex flex-wrap gap-1">
              {event.category && (
                <Badge variant="outline" className="text-xs py-0.5 px-2 bg-sky-50 border-sky-200 text-sky-700">
                  {event.category}
                </Badge>
              )}
              {/* @ts-ignore */}
              {event.subcategory && (
                <Badge variant="outline" className="text-xs py-0.5 px-2 bg-sky-50 border-sky-200 text-sky-700">
                  {/* @ts-ignore */}
                  {event.subcategory}
                </Badge>
              )}
            </div>
          </div>

          {/* User in top right corner - simplified */}
          <div className="flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-7 w-7 border border-sky-100">
                <AvatarImage
                  src={
                    (event as any).profile_id === null
                      ? "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
                      : (event.profiles?.avatar_url ?? undefined)
                  }
                  alt={(event as any).profile_id === null ? "Anonymous Organizer" : (event.profiles?.display_name ?? "")}
                />
                <AvatarFallback>
                  {(event as any).profile_id === null ? "A" : ((event.profiles?.display_name ?? "E").charAt(0).toUpperCase())}
                </AvatarFallback>
              </Avatar>
              <div className="text-right leading-tight max-w-[110px]">
                {(event as any).profile_id === null ? (
                  <p className="text-xs text-gray-500 font-medium truncate">Anonymous</p>
                ) : event.user_id && event.profiles?.display_name ? (
                  <Link 
                    href={`/profile/${event.user_id}`} 
                    className="text-xs text-gray-800 hover:underline block truncate"
                    title={event.profiles.display_name}
                  >
                    {event.profiles.display_name}
                  </Link>
                ) : (
                  <p className="text-xs text-gray-800 truncate">
                    {event.profiles?.display_name ?? "Organizer"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Poster */}
      {event.image_url && (
        <div className="px-3">
          {onQuickView ? (
            <button
              type="button"
              onClick={() => onQuickView(event)}
              className="block w-full text-left cursor-pointer group overflow-hidden rounded-xl"
            >
              <img
                src={event.image_url}
                alt={event.title}
                className="block h-auto max-h-[420px] w-full object-cover rounded-xl group-hover:scale-[1.01] transition-transform duration-200"
              />
            </button>
          ) : (
            <Link href={`/events/${event.id}`} onClick={() => handleEventInteraction("view")} className="block overflow-hidden rounded-xl">
              <img
                src={event.image_url}
                alt={event.title}
                className="block h-auto max-h-[420px] w-full object-cover rounded-xl hover:scale-[1.01] transition-transform duration-200"
              />
            </Link>
          )}
        </div>
      )}

      {/* Event Details and Actions */}
      <div className="p-3 pt-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              <span className="text-xs">{dateLabel}</span>
            </div>
            {/* Clickable Venue Link */}
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-sky-500 shrink-0" />
              <Link
                href={`/venues/${slugifyVenue(event.venue || event.location || "colombo")}`}
                className="text-xs truncate font-medium text-sky-700 hover:text-sky-900 hover:underline transition-colors"
                title={`See events and showtimes at ${event.venue || event.location || "this venue"}`}
              >
                {event.venue ? `${event.venue}, ` : ""}{event.location}
              </Link>
            </div>
            {/* Attendance label */}
            <div className="text-xs text-gray-500 mt-0.5">{attendanceLabel}</div>
          </div>

          <div className="flex items-center gap-1.5 sm:self-start">
            <Button
              size="sm"
              className={cn(
                "h-8 px-3 bg-sky-100 text-sky-800 hover:bg-sky-200 text-xs font-medium",
                isGoing && "bg-sky-600 text-white hover:bg-sky-700",
              )}
              onClick={() => handleEventInteraction("attending")}
              aria-pressed={isGoing}
            >
              <Users className="mr-1 h-3.5 w-3.5" />
              {isGoing ? "Going" : "Go"}
            </Button>
            {onQuickView ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs font-medium hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
                onClick={() => onQuickView(event)}
              >
                Details
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs font-medium">
                <Link href={`/events/${event.id}`} onClick={() => handleEventInteraction("view")}>
                  Details
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between px-3 pb-2 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Heart className="h-3.5 w-3.5 text-rose-400" />
          <span className="font-medium">
            {optimisticLikes} {optimisticLikes === 1 ? "like" : "likes"}
          </span>
        </div>
        <button onClick={handleToggleComments} className="hover:underline text-xs">
          {isCommentsOpen ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "View comments"}
        </button>
      </div>

      {/* Actions */}
      <div className="flex border-t border-sky-100 text-xs font-medium text-gray-600">
        <Button
          variant="ghost"
          className={cn("flex-1 rounded-none py-2 hover:bg-rose-50", optimisticIsLiked && "text-rose-600")}
          onClick={() => handleEventInteraction("like")}
          aria-pressed={optimisticIsLiked}
        >
          <Heart className="mr-1 h-3.5 w-3.5" /> Like
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-none border-l border-sky-100 py-2 hover:bg-sky-50"
          onClick={handleToggleComments}
        >
          <MessageCircle className="mr-1 h-3.5 w-3.5" /> Comment
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-none border-l border-sky-100 py-2 hover:bg-sky-50"
          onClick={handleShareEvent}
        >
          <Share2 className="mr-1 h-3.5 w-3.5" /> Share
        </Button>
      </div>

      {/* Comments */}
      {isCommentsOpen && (
        <div className="space-y-2 border-t border-sky-100 bg-sky-50/60 p-3">
          {user ? (
            <div className="space-y-1.5">
              <Textarea
                rows={2}
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                className="min-h-[48px] border-sky-200 bg-white focus-visible:ring-sky-400 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  className="h-8 px-3 bg-sky-600 text-white hover:bg-sky-700 text-xs"
                  onClick={handleCommentSubmit}
                  disabled={isCommentButtonDisabled}
                >
                  {isSubmittingComment ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">
              <Link href="/auth/login" className="font-semibold text-sky-700 hover:underline">Sign in</Link> to comment.
            </p>
          )}
          <div className="space-y-1.5">
            {isLoadingComments && comments.length === 0 ? (
              <p className="text-xs text-gray-500">Loading comments…</p>
            ) : comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2 rounded bg-white p-2 shadow-sm">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback>{(c.profiles?.display_name ?? "U").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-gray-900">{c.profiles?.display_name ?? "Member"}</p>
                      <span className="text-xs uppercase tracking-wide text-gray-400">
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700">{c.content}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">No comments yet. Be the first to share!</p>
            )}
            {commentError && <p className="text-xs text-red-600">{commentError}</p>}
          </div>
        </div>
      )}

      {/* Owner Actions */}
      {isOwner && (
        <div className="border-t border-sky-100 bg-sky-50/50 px-3 py-2">
          <div className="flex items-center justify-end gap-1.5">
            <Button asChild size="sm" variant="outline" className="h-7 px-3 bg-white text-xs">
              <Link href={`/events/${event.id}/edit`}>
                <Edit className="mr-1 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
            <Dialog onOpenChange={(open) => !open && setIsDeleting(false)}>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive" className="h-7 px-3 text-xs">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Are you sure?</DialogTitle>
                  <DialogDescription>This will permanently delete your event.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" disabled={isDeleting}>Cancel</Button>
                  </DialogClose>
                  <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </Card>
  )
}
