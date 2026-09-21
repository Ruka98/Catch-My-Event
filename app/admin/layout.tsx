"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AdminGuard, useAuth } from "@/components/auth-guard"
import {
  LayoutDashboard,
  Calendar,
  Users,
  ExternalLink,
  PlusCircle,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  CalendarDays
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    {
      title: "Overview",
      href: "/admin",
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: "All Events",
      href: "/admin/events",
      icon: Calendar,
      exact: false,
    },
    {
      title: "Users & Organizers",
      href: "/admin/users",
      icon: Users,
      exact: false,
    },
  ]

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return pathname === item.href
    }
    return pathname.startsWith(item.href)
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 text-slate-200">
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/admin" className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-base tracking-tight leading-none">Catch My Event</h1>
                <span className="text-[11px] font-semibold tracking-wider text-sky-400 uppercase">Admin Center</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Management
            </div>
            {navItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    active
                      ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                      : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                  }`}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-white" : "text-slate-400"}`} />
                  {item.title}
                </Link>
              )
            })}

            <div className="pt-6 pb-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
                Quick Shortcuts
              </div>
              <Link
                href="/post-event"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
              >
                <PlusCircle className="h-4 w-4 text-emerald-400" />
                Post New Event
              </Link>
              <Link
                href="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-slate-400" />
                Live Website
              </Link>
            </div>
          </div>

          {/* Current Admin User Info */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-9 w-9 border border-slate-700">
                  <AvatarImage src={user?.avatar || undefined} />
                  <AvatarFallback className="bg-sky-600 text-white text-xs font-bold">
                    {user?.name?.slice(0, 2).toUpperCase() || "AD"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || "Admin"}</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-500/20 text-sky-300">
                    Super Admin
                  </span>
                </div>
              </div>
              <button
                onClick={() => logout()}
                title="Logout"
                className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
            <Link href="/admin" className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-sky-400" />
              <span className="font-bold text-sm">CME Admin</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </header>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(item) ? "bg-sky-500 text-white" : "text-slate-300"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
              <div className="border-t border-slate-800 pt-2 mt-2 space-y-1">
                <Link
                  href="/post-event"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-emerald-400 font-medium"
                >
                  <PlusCircle className="h-4 w-4" />
                  Post New Event
                </Link>
                <Link
                  href="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Live Website
                </Link>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  )
}
