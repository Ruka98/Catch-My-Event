"use client"

import React, { useEffect, useState, useCallback, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-guard"
import {
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Calendar,
  MoreVertical,
  CheckCircle2,
  Ban,
  Bot,
  RotateCcw,
  AlertTriangle,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { detectBotOrSpam } from "@/lib/admin/quality-engine"
import { SuspendUserModal } from "@/components/admin/suspend-user-modal"

interface UserProfile {
  id: string
  display_name: string | null
  user_name: string | null
  avatar_url: string | null
  is_admin?: boolean
  is_suspended?: boolean
  suspension_reason?: string | null
  suspended_at?: string | null
  created_at: string | null
  events_count?: number
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended" | "bots" | "admin">("all")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Suspend Modal state
  const [suspendModalUser, setSuspendModalUser] = useState<UserProfile | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, user_name, avatar_url, is_admin, is_suspended, suspension_reason, suspended_at, created_at")
        .order("created_at", { ascending: false })

      if (profilesError) throw profilesError

      // 2. Fetch event counts per user
      const { data: eventsData } = await supabase
        .from("events")
        .select("user_id")

      const countMap: Record<string, number> = {}
      if (eventsData) {
        eventsData.forEach((e: any) => {
          if (e.user_id) {
            countMap[e.user_id] = (countMap[e.user_id] || 0) + 1
          }
        })
      }

      const merged = (profilesData || []).map((p: any) => ({
        ...p,
        events_count: countMap[p.id] || 0,
      }))

      setUsers(merged)
    } catch (err) {
      console.error("Failed to load users:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const toggleAdminRole = async (targetUser: UserProfile) => {
    if (targetUser.id === currentAdmin?.id) {
      alert("You cannot remove admin privileges from your own active account.")
      return
    }

    const nextStatus = !targetUser.is_admin
    const confirmMsg = nextStatus
      ? `Promote "${targetUser.display_name || targetUser.user_name || "this user"}" to Platform Administrator?`
      : `Remove Administrator access from "${targetUser.display_name || targetUser.user_name || "this user"}"?`

    if (!confirm(confirmMsg)) return

    setActionLoadingId(targetUser.id)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: nextStatus })
        .eq("id", targetUser.id)

      if (!error) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, is_admin: nextStatus } : u))
        )
      } else {
        alert("Failed to update role: " + error.message)
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Restore / Unsuspend user
  const handleUnsuspendUser = async (targetUser: UserProfile) => {
    if (!confirm(`Restore and unsuspend account "${targetUser.display_name || targetUser.user_name}"?`)) return
    setActionLoadingId(targetUser.id)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_suspended: false, suspension_reason: null, suspended_at: null })
        .eq("id", targetUser.id)

      if (!error) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetUser.id
              ? { ...u, is_suspended: false, suspension_reason: null, suspended_at: null }
              : u
          )
        )
      } else {
        alert("Failed to restore user: " + error.message)
      }
    } catch (err: any) {
      alert("Error: " + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Quick Action: "Nuke Bot" (1-click ban account and unpublish events)
  const handleNukeBot = async (targetUser: UserProfile) => {
    if (
      !confirm(
        `🚨 NUKE BOT: Are you sure you want to immediately BAN "${targetUser.display_name || targetUser.user_name}" and HIDE all ${targetUser.events_count || 0} events created by this account?`
      )
    ) {
      return
    }

    setActionLoadingId(targetUser.id)
    const supabase = createClient()
    try {
      await supabase
        .from("profiles")
        .update({
          is_suspended: true,
          suspension_reason: "Automated Bot / Spammer (Nuked)",
          suspended_at: new Date().toISOString(),
        })
        .eq("id", targetUser.id)

      await supabase
        .from("events")
        .update({ status: "hidden" })
        .eq("user_id", targetUser.id)

      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                is_suspended: true,
                suspension_reason: "Automated Bot / Spammer (Nuked)",
              }
            : u
        )
      )
    } catch (err: any) {
      alert("Failed to nuke bot: " + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleSuspendedCallback = (userId: string, reason: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, is_suspended: true, suspension_reason: reason } : u
      )
    )
  }

  // Pre-calculate bot reports
  const userBotReports = useMemo(() => {
    const map = new Map<string, ReturnType<typeof detectBotOrSpam>>()
    users.forEach((u) => {
      map.set(u.id, detectBotOrSpam(u))
    })
    return map
  }, [users])

  const botCount = useMemo(() => {
    let count = 0
    users.forEach((u) => {
      if (!u.is_suspended && userBotReports.get(u.id)?.isSuspect) count++
    })
    return count
  }, [users, userBotReports])

  const suspendedCount = useMemo(() => users.filter((u) => u.is_suspended).length, [users])
  const activeCount = useMemo(() => users.filter((u) => !u.is_suspended).length, [users])
  const adminCount = useMemo(() => users.filter((u) => u.is_admin).length, [users])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.display_name || "").toLowerCase()
      const username = (u.user_name || "").toLowerCase()
      const q = searchQuery.toLowerCase()

      const matchesSearch = q === "" || name.includes(q) || username.includes(q)

      let matchesStatus = true
      if (statusFilter === "active") matchesStatus = !u.is_suspended
      if (statusFilter === "suspended") matchesStatus = Boolean(u.is_suspended)
      if (statusFilter === "bots") matchesStatus = Boolean(userBotReports.get(u.id)?.isSuspect)
      if (statusFilter === "admin") matchesStatus = Boolean(u.is_admin)

      return matchesSearch && matchesStatus
    })
  }, [users, searchQuery, statusFilter, userBotReports])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users, Organizers & Anti-Bot Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review accounts, identify automated spammers, suspend bot accounts, and manage platform administrator permissions.
        </p>
      </div>

      {/* Health Status & Filter Bar */}
      <Card className="p-4 bg-white border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search users by name or username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
              className={`text-xs ${statusFilter === "all" ? "bg-slate-900 text-white" : ""}`}
            >
              All ({users.length})
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className={`text-xs ${statusFilter === "active" ? "bg-slate-800 text-white" : ""}`}
            >
              Active ({activeCount})
            </Button>
            <Button
              variant={statusFilter === "bots" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("bots")}
              className={`text-xs ${
                statusFilter === "bots"
                  ? "bg-amber-600 text-white"
                  : botCount > 0
                  ? "text-amber-700 border-amber-300 bg-amber-50"
                  : ""
              }`}
            >
              <Bot className="h-3 w-3 mr-1" />
              Suspect Bots ({botCount})
            </Button>
            <Button
              variant={statusFilter === "suspended" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("suspended")}
              className={`text-xs ${
                statusFilter === "suspended"
                  ? "bg-rose-600 text-white"
                  : suspendedCount > 0
                  ? "text-rose-700 border-rose-300 bg-rose-50"
                  : ""
              }`}
            >
              <Ban className="h-3 w-3 mr-1" />
              Suspended ({suspendedCount})
            </Button>
            <Button
              variant={statusFilter === "admin" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("admin")}
              className={`text-xs ${statusFilter === "admin" ? "bg-sky-600 text-white" : ""}`}
            >
              <ShieldCheck className="h-3 w-3 mr-1" />
              Admins ({adminCount})
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto mb-2" />
            Loading accounts & evaluating bot heuristics...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No accounts found matching your search and filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">User Profile</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Events Posted</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3">Account Status</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((profile) => {
                  const botReport = userBotReports.get(profile.id)

                  return (
                    <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* User Profile */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-bold">
                              {(profile.display_name || profile.user_name || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-900 truncate">
                                {profile.display_name || "Anonymous Member"}
                              </p>
                              {botReport?.isSuspect && !profile.is_suspended && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-200"
                                  title={botReport.reasons.join(" ")}
                                >
                                  <Bot className="h-3 w-3 text-amber-700" /> Bot Suspect ({botReport.confidence}%)
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">ID: {profile.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {profile.user_name ? (
                          <span className="font-medium text-slate-700">@{profile.user_name}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Events Count */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{profile.events_count || 0} events</span>
                        </div>
                      </td>

                      {/* Joined Date */}
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                      </td>

                      {/* Account Status Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {profile.is_suspended ? (
                          <div className="flex flex-col gap-0.5">
                            <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold gap-1 inline-flex w-fit">
                              <Ban className="h-3 w-3" /> Suspended
                            </Badge>
                            {profile.suspension_reason && (
                              <span
                                className="text-[10px] text-rose-700 truncate max-w-[140px]"
                                title={profile.suspension_reason}
                              >
                                {profile.suspension_reason}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
                            Active
                          </Badge>
                        )}
                      </td>

                      {/* Role Badge */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {profile.is_admin ? (
                          <Badge className="bg-sky-100 text-sky-800 border-sky-200 font-semibold gap-1">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-slate-600 font-normal">
                            Member
                          </Badge>
                        )}
                      </td>

                      {/* Moderation Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {profile.id === currentAdmin?.id ? (
                            <span className="text-xs text-slate-400 italic">Current User</span>
                          ) : (
                            <>
                              {/* Suspend / Restore Action */}
                              {profile.is_suspended ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actionLoadingId === profile.id}
                                  onClick={() => handleUnsuspendUser(profile)}
                                  className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Unsuspend
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={actionLoadingId === profile.id}
                                    onClick={() => setSuspendModalUser(profile)}
                                    className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                                  >
                                    <Ban className="h-3 w-3 mr-1" />
                                    Suspend
                                  </Button>

                                  {/* Quick 1-Click "Nuke Bot" if suspect */}
                                  {botReport?.isSuspect && (
                                    <Button
                                      size="sm"
                                      disabled={actionLoadingId === profile.id}
                                      onClick={() => handleNukeBot(profile)}
                                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                                      title="Instant Ban + Hide all events"
                                    >
                                      <Zap className="h-3 w-3 mr-1" />
                                      Nuke Bot
                                    </Button>
                                  )}
                                </>
                              )}

                              {/* Admin Role Toggle */}
                              <Button
                                size="sm"
                                variant={profile.is_admin ? "outline" : "secondary"}
                                disabled={actionLoadingId === profile.id}
                                onClick={() => toggleAdminRole(profile)}
                                className={
                                  profile.is_admin
                                    ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 text-xs"
                                    : "text-xs"
                                }
                              >
                                {profile.is_admin ? "Revoke Admin" : "Make Admin"}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Suspend User Modal */}
      <SuspendUserModal
        isOpen={Boolean(suspendModalUser)}
        onClose={() => setSuspendModalUser(null)}
        user={suspendModalUser}
        onSuspended={handleSuspendedCallback}
      />
    </div>
  )
}
