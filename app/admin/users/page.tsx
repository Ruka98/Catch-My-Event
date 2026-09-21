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
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface UserProfile {
  id: string
  display_name: string | null
  user_name: string | null
  avatar_url: string | null
  is_admin?: boolean
  created_at: string | null
  events_count?: number
}

export default function AdminUsersPage() {
  const { user: currentAdmin } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all")
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, user_name, avatar_url, is_admin, created_at")
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

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const name = (u.display_name || "").toLowerCase()
      const username = (u.user_name || "").toLowerCase()
      const q = searchQuery.toLowerCase()

      const matchesSearch = q === "" || name.includes(q) || username.includes(q)

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" && u.is_admin) ||
        (roleFilter === "user" && !u.is_admin)

      return matchesSearch && matchesRole
    })
  }, [users, searchQuery, roleFilter])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Users & Organizers</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review registered accounts, grant or revoke Administrator permissions, and inspect organizer activity.
        </p>
      </div>

      {/* Filters */}
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

          <div className="flex items-center gap-2">
            <Button
              variant={roleFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter("all")}
              className={roleFilter === "all" ? "bg-slate-900 text-white" : ""}
            >
              All ({users.length})
            </Button>
            <Button
              variant={roleFilter === "admin" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter("admin")}
              className={roleFilter === "admin" ? "bg-sky-600 text-white" : ""}
            >
              Admins ({users.filter((u) => u.is_admin).length})
            </Button>
            <Button
              variant={roleFilter === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter("user")}
              className={roleFilter === "user" ? "bg-slate-900 text-white" : ""}
            >
              Members ({users.filter((u) => !u.is_admin).length})
            </Button>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-600 border-t-transparent mx-auto mb-2" />
            Loading accounts...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No users found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">User Profile</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Events Posted</th>
                  <th className="px-4 py-3">Joined Date</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((profile) => (
                  <tr key={profile.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-sky-100 text-sky-700 text-xs font-bold">
                            {(profile.display_name || profile.user_name || "U").slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {profile.display_name || "Anonymous Member"}
                          </p>
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

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {profile.id === currentAdmin?.id ? (
                        <span className="text-xs text-slate-400 italic">Current User</span>
                      ) : (
                        <Button
                          size="sm"
                          variant={profile.is_admin ? "outline" : "secondary"}
                          disabled={actionLoadingId === profile.id}
                          onClick={() => toggleAdminRole(profile)}
                          className={profile.is_admin ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" : ""}
                        >
                          {profile.is_admin ? "Revoke Admin" : "Make Admin"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
