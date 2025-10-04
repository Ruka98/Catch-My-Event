"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, type ComponentType, type SVGProps } from "react"
import { useAuth } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Bell,
  Home,
  LogOut,
  Map as MapIcon,
  PlusCircle,
  User,
} from "lucide-react"

type NavSection = "feed" | "map" | "notifications" | "profile"

type InitialUser = {
  id: string
  name?: string | null
  email?: string | null
}

type NavItem = {
  key: NavSection
  label: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

export function SocialTopNav({
  active,
  initialUser,
}: {
  active: NavSection
  initialUser?: InitialUser | null
}) {
  const { user: contextUser, logout } = useAuth()
  const user = contextUser ?? initialUser ?? null

  const navItems = useMemo<NavItem[]>(() => {
    const baseItems: NavItem[] = [
      {
        key: "feed",
        label: "Feed",
        href: "/",
        icon: Home,
      },
      {
        key: "map",
        label: "Event map",
        href: "/map",
        icon: MapIcon,
      },
    ]

    if (!user) {
      return baseItems
    }

    return [
      ...baseItems,
      {
        key: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
      },
      {
        key: "profile",
        label: "Profile",
        href: "/profile",
        icon: User,
      },
    ]
  }, [user])

  return (
    <header className="sticky top-0 z-[1200] border-b border-sky-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="group flex items-center gap-2">
          <Image src="/logo.png" alt="Catch My Event logo" width={32} height={32} />
          <span className="font-playfair text-xl font-bold text-gray-900 transition group-hover:text-sky-700">
            Catch My Event
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = item.key === active
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-sky-100 text-sky-700"
                    : "text-gray-600 hover:bg-sky-50 hover:text-sky-600",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex md:hidden items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = item.key === active
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full transition",
                    isActive
                      ? "bg-sky-100 text-sky-700"
                      : "text-gray-600 hover:bg-sky-50 hover:text-sky-600",
                  )}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              )
            })}
          </div>

          {user ? (
            <>
              <Button
                asChild
                size="sm"
                className="hidden sm:inline-flex gap-2 bg-sky-600 text-white hover:bg-sky-700"
              >
                <Link href="/post-event">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Post event</span>
                </Link>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border-sky-200 text-sky-700 hover:bg-sky-50"
                onClick={() => {
                  void logout()
                }}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-sky-600 text-white hover:bg-sky-700">
                <Link href="/auth/signup">Create account</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
