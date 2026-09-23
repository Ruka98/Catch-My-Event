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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShieldAlert, AlertTriangle, UserX, Ban } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface SuspendUserModalProps {
  isOpen: boolean
  onClose: () => void
  user: {
    id: string
    display_name: string | null
    user_name: string | null
    events_count?: number
  } | null
  onSuspended: (userId: string, reason: string, eventsHidden: boolean) => void
}

const COMMON_REASONS = [
  "Automated Bot / High Velocity Spammer",
  "Repeated Fake / Inappropriate Event Submissions",
  "Commercial Spam / Unauthorized Ticketing Links",
  "Violating Community Guidelines & Terms of Service",
  "Duplicate / Sybil Spam Account",
  "Custom Reason",
]

export function SuspendUserModal({
  isOpen,
  onClose,
  user,
  onSuspended,
}: SuspendUserModalProps) {
  const [selectedReason, setSelectedReason] = useState(COMMON_REASONS[0])
  const [customReason, setCustomReason] = useState("")
  const [hideEvents, setHideEvents] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!user) return null

  const handleConfirmSuspend = async () => {
    setIsSubmitting(true)
    const reasonText = selectedReason === "Custom Reason" ? customReason || "Administrator Discretion" : selectedReason
    const supabase = createClient()

    try {
      // 1. Try RPC function first
      const { error: rpcError } = await supabase.rpc("admin_suspend_user", {
        target_user_id: user.id,
        reason: reasonText,
        hide_events: hideEvents,
      })

      // 2. Fallback to direct updates if RPC not yet run
      if (rpcError) {
        const { error: profError } = await supabase
          .from("profiles")
          .update({
            is_suspended: true,
            suspension_reason: reasonText,
            suspended_at: new Date().toISOString(),
          })
          .eq("id", user.id)

        if (profError) throw profError

        if (hideEvents) {
          await supabase
            .from("events")
            .update({ status: "hidden" })
            .eq("user_id", user.id)
        }
      }

      onSuspended(user.id, reasonText, hideEvents)
      onClose()
    } catch (err: any) {
      alert("Failed to suspend account: " + (err.message || "Unknown error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg text-rose-950">Suspend User Account</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Revoke posting privileges and clean up bot/spam activities.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Target User Info */}
          <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/50 text-xs space-y-1">
            <div className="font-semibold text-rose-950 text-sm">
              {user.display_name || user.user_name || "Target User"}
            </div>
            <div className="text-slate-600 flex items-center justify-between">
              <span>Handle: @{user.user_name || "anonymous"}</span>
              <span className="font-medium text-rose-700">
                {user.events_count || 0} active events
              </span>
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Suspension Reason:</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedReason === "Custom Reason" && (
              <Input
                placeholder="Enter specific suspension rationale..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="text-xs mt-1.5"
              />
            )}
          </div>

          {/* Auto-Hide Events Checkbox */}
          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="hideEvents"
              checked={hideEvents}
              onCheckedChange={(checked) => setHideEvents(Boolean(checked))}
            />
            <div className="grid gap-1 leading-none">
              <label
                htmlFor="hideEvents"
                className="text-xs font-semibold text-slate-800 cursor-pointer"
              >
                Hide all {user.events_count || 0} events posted by this user
              </label>
              <p className="text-[11px] text-slate-500">
                Unpublishes their submissions from the public home, search, and calendar instantly.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmSuspend}
            disabled={isSubmitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
          >
            {isSubmitting ? "Suspending..." : "Confirm Suspension"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
