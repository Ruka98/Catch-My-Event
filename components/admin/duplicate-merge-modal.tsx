"use client"

import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Copy,
  ArrowRight,
  GitMerge,
  Trash2,
  ExternalLink,
  Calendar,
  MapPin,
  Tag,
  CheckCircle2,
  Users,
  Eye,
  AlertCircle,
  Sparkles,
  Check,
  Heart,
  ShieldCheck,
} from "lucide-react"
import { DuplicateCluster, EventAuditItem } from "@/lib/admin/quality-engine"
import { createClient } from "@/lib/supabase/client"

interface DuplicateMergeModalProps {
  isOpen: boolean
  onClose: () => void
  cluster: DuplicateCluster | null
  onMergeComplete: (primaryId: string, removedId: string) => void
  onDismissDuplicate: (pairKey: string) => void
}

export function DuplicateMergeModal({
  isOpen,
  onClose,
  cluster,
  onMergeComplete,
  onDismissDuplicate,
}: DuplicateMergeModalProps) {
  const [isMerging, setIsMerging] = useState(false)
  const [isHardDeleting, setIsHardDeleting] = useState(false)

  // Custom field overrides if the admin chooses to combine best parts
  const [selectedFields, setSelectedFields] = useState<{
    imageSourceId?: string
    titleSourceId?: string
    venueSourceId?: string
  }>({})

  if (!cluster) return null

  const { primaryEvent, duplicateEvent, similarityScore, reasons } = cluster
  const pairKey = [primaryEvent.id, duplicateEvent.id].sort().join("::")

  const handleMerge = async (chosenPrimary: EventAuditItem, chosenDuplicate: EventAuditItem) => {
    if (
      !confirm(
        `Merge Duplicate: Keep "${chosenPrimary.title}" as primary event? Attendee RSVPs and Likes will be transferred from "${chosenDuplicate.title}", and the duplicate will be hidden.`
      )
    ) {
      return
    }

    setIsMerging(true)
    const supabase = createClient()
    try {
      // 1. Transfer any event attendees to primary
      try {
        const { data: dupAttendees } = await supabase
          .from("event_attendees")
          .select("user_id")
          .eq("event_id", chosenDuplicate.id)

        if (dupAttendees && dupAttendees.length > 0) {
          for (const att of dupAttendees) {
            await supabase
              .from("event_attendees")
              .insert({ event_id: chosenPrimary.id, user_id: att.user_id })
              .catch(() => {}) // Ignore if already registered
          }
        }
      } catch (e) {
        console.warn("Could not migrate attendees:", e)
      }

      // 2. Transfer likes to primary
      try {
        const { data: dupLikes } = await supabase
          .from("likes")
          .select("user_id")
          .eq("event_id", chosenDuplicate.id)

        if (dupLikes && dupLikes.length > 0) {
          for (const like of dupLikes) {
            await supabase
              .from("likes")
              .insert({ event_id: chosenPrimary.id, user_id: like.user_id })
              .catch(() => {})
          }
        }
      } catch (e) {
        console.warn("Could not migrate likes:", e)
      }

      // 3. Apply any selected field overrides to primary (e.g. better image or cleaner title)
      const updates: Record<string, any> = {}
      if (selectedFields.imageSourceId === chosenDuplicate.id && chosenDuplicate.image_url) {
        updates.image_url = chosenDuplicate.image_url
      }
      if (selectedFields.titleSourceId === chosenDuplicate.id && chosenDuplicate.title) {
        updates.title = chosenDuplicate.title
      }
      if (selectedFields.venueSourceId === chosenDuplicate.id && chosenDuplicate.venue) {
        updates.venue = chosenDuplicate.venue
        if (chosenDuplicate.latitude && chosenDuplicate.longitude) {
          updates.latitude = chosenDuplicate.latitude
          updates.longitude = chosenDuplicate.longitude
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase.from("events").update(updates).eq("id", chosenPrimary.id)
      }

      // 4. Hide the duplicate event
      const { error: hideErr } = await supabase
        .from("events")
        .update({ status: "hidden" })
        .eq("id", chosenDuplicate.id)

      if (hideErr) throw hideErr

      onMergeComplete(chosenPrimary.id, chosenDuplicate.id)
      onClose()
    } catch (err: any) {
      alert("Error merging events: " + (err.message || "Failed"))
    } finally {
      setIsMerging(false)
    }
  }

  const handleHardDeleteDuplicate = async (dupId: string, dupTitle: string) => {
    if (
      !confirm(
        `Permanent Delete: Are you sure you want to permanently delete "${dupTitle}"? This cannot be undone.`
      )
    ) {
      return
    }

    setIsHardDeleting(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from("events").delete().eq("id", dupId)
      if (error) throw error
      onMergeComplete(primaryEvent.id, dupId)
      onClose()
    } catch (err: any) {
      alert("Failed to delete event: " + (err.message || "Unknown error"))
    } finally {
      setIsHardDeleting(false)
    }
  }

  const renderEventCard = (e: EventAuditItem, isPrimary: boolean, otherEvent: EventAuditItem) => {
    const isTitleDiff = e.title.trim().toLowerCase() !== otherEvent.title.trim().toLowerCase()
    const isDateDiff = e.date !== otherEvent.date
    const isVenueDiff = (e.venue || "").trim().toLowerCase() !== (otherEvent.venue || "").trim().toLowerCase()
    const isPriceDiff = e.price !== otherEvent.price

    const isImageSelected = selectedFields.imageSourceId === e.id
    const isTitleSelected = selectedFields.titleSourceId === e.id

    return (
      <div
        className={`flex-1 flex flex-col p-4 rounded-xl border transition-all ${
          isPrimary
            ? "border-sky-300 bg-sky-50/20 shadow-sm ring-1 ring-sky-200"
            : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <Badge
            className={
              isPrimary
                ? "bg-sky-600 text-white font-semibold"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }
          >
            {isPrimary ? "Suggested Primary (Most Views / Engagement)" : "Candidate Duplicate"}
          </Badge>
          <span className="text-[11px] font-mono text-slate-400">ID: {e.id.slice(0, 8)}</span>
        </div>

        {/* Thumbnail & Title */}
        <div className="flex items-start gap-3 my-3">
          <div className="relative group">
            <img
              src={
                e.image_url ||
                "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=120&auto=format&fit=crop&q=80"
              }
              alt=""
              className={`h-20 w-20 rounded-lg object-cover bg-slate-100 shrink-0 border ${
                isImageSelected ? "ring-2 ring-sky-600 border-sky-400" : "border-slate-200"
              }`}
            />
            {e.image_url && (
              <button
                type="button"
                onClick={() =>
                  setSelectedFields((prev) => ({
                    ...prev,
                    imageSourceId: prev.imageSourceId === e.id ? undefined : e.id,
                  }))
                }
                className="mt-1 w-full text-[10px] text-center font-medium text-sky-700 bg-sky-50 rounded hover:bg-sky-100 py-0.5"
                title="Use this flyer on the merged event"
              >
                {isImageSelected ? "✓ Using Flyer" : "Use This Flyer"}
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h4
              className={`font-semibold text-sm leading-snug line-clamp-2 ${
                isTitleDiff ? "text-amber-900 bg-amber-50 px-1 rounded" : "text-slate-900"
              }`}
            >
              {e.title}
            </h4>
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                <Eye className="h-3 w-3 text-slate-400" /> {e.views || 0} views
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-indigo-600">
                <Users className="h-3 w-3" /> {e.attendees_count || 0} RSVPs
              </span>
            </div>
            {isTitleDiff && (
              <button
                type="button"
                onClick={() =>
                  setSelectedFields((prev) => ({
                    ...prev,
                    titleSourceId: prev.titleSourceId === e.id ? undefined : e.id,
                  }))
                }
                className="mt-1.5 text-[10px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded hover:bg-sky-100 font-medium"
              >
                {isTitleSelected ? "✓ Selected Title" : "Prefer This Title"}
              </button>
            )}
          </div>
        </div>

        {/* Comparison Details with Diff Highlighting */}
        <div className="space-y-2 text-xs flex-1">
          <div
            className={`p-2 rounded flex items-center justify-between ${
              isDateDiff ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Date:
            </span>
            <span className="font-semibold">{e.date || "None"}</span>
          </div>

          <div
            className={`p-2 rounded flex items-center justify-between ${
              isVenueDiff ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className="flex items-center gap-1.5 text-slate-500 truncate mr-2">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> Venue:
            </span>
            <span className="font-medium truncate max-w-[160px]">{e.venue || "None specified"}</span>
          </div>

          <div
            className={`p-2 rounded flex items-center justify-between ${
              isPriceDiff ? "bg-amber-50 text-amber-900 border border-amber-200" : "bg-slate-50 text-slate-700"
            }`}
          >
            <span className="text-slate-500">Price:</span>
            <span className="font-semibold">
              {e.price === 0 ? "Free" : `LKR ${e.price?.toLocaleString() || 0}`}
            </span>
          </div>

          <div className="p-2 rounded bg-slate-50 text-slate-700 flex items-center justify-between">
            <span className="text-slate-500">Uploader:</span>
            <span className="font-medium truncate max-w-[150px]">
              {e.profiles?.display_name || e.profiles?.user_name || "Anonymous / Scraper"}
            </span>
          </div>

          {e.website_url && (
            <div className="pt-1">
              <a
                href={e.website_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-600 hover:underline flex items-center gap-1 truncate"
              >
                <ExternalLink className="h-3 w-3 shrink-0" /> {e.website_url}
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 mt-3 space-y-2">
          <Button
            type="button"
            className={`w-full text-xs font-semibold ${
              isPrimary
                ? "bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
                : "bg-slate-800 hover:bg-slate-900 text-white"
            }`}
            onClick={() => handleMerge(e, otherEvent)}
            disabled={isMerging || isHardDeleting}
          >
            <GitMerge className="h-3.5 w-3.5 mr-1.5" />
            Keep This & Merge Other
          </Button>

          {!isPrimary && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleHardDeleteDuplicate(e.id, e.title)}
              disabled={isMerging || isHardDeleting}
              className="w-full text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Permanently Delete Duplicate
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                Suspect Duplicate Inspector & Merger
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                  {similarityScore}% Match
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Compare side-by-side, consolidate attendee RSVPs & likes, and optionally preserve best flyer or title.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Why flagged banner */}
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 text-xs text-amber-900 space-y-1">
          <div className="font-semibold flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
            Duplicate Detection Flags:
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 pl-1">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>

        {/* Side-by-side Event Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
          {renderEventCard(primaryEvent, true, duplicateEvent)}
          {renderEventCard(duplicateEvent, false, primaryEvent)}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onDismissDuplicate(pairKey)
              onClose()
            }}
            disabled={isMerging || isHardDeleting}
            className="text-slate-600"
          >
            Mark as Separate Edition (Not a Duplicate)
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isMerging || isHardDeleting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
