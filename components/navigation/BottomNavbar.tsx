"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, MapPin, Plus, Building2, User } from "lucide-react"
import { useAuth } from "@/components/auth-guard"
import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"

const BottomNavbar = () => {
  const pathname = usePathname() || ""
  const router = useRouter()
  const { user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { href: "/", icon: Home, label: "Feed", isCenter: false, isProtected: false },
    { href: "/map", icon: MapPin, label: "Map", isCenter: false, isProtected: false },
    ...(user
      ? [
          { href: "/post-event", icon: Plus, label: "Post", isCenter: true, isProtected: true },
          { href: "/venues", icon: Building2, label: "Places", isCenter: false, isProtected: false },
          { href: "/profile", icon: User, label: "Profile", isCenter: false, isProtected: false },
        ]
      : [
          { href: "/venues", icon: Building2, label: "Places", isCenter: false, isProtected: false },
        ]),
  ]

  const hiddenPaths = [
    "/unauthorized",
  ]

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>, href: string, isProtected?: boolean) => {
      e.preventDefault()
      if (isProtected && !user) {
        sessionStorage.setItem("redirect", pathname)
        router.push(`/auth/login`)
      } else {
        router.push(href)
      }
    },
    [user, router, pathname]
  )

  if (!mounted || hiddenPaths.includes(pathname)) {
    return null
  }

  return (
    <nav
      style={{ zIndex: 99999 }}
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex justify-around items-center max-w-lg mx-auto h-[60px] px-4">
        {navItems.map(({ href, icon: Icon, label, isCenter, isProtected }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)

          if (isCenter) {
            return (
              <Link
                key={href}
                href={href}
                onClick={(e) => handleLinkClick(e, href, isProtected)}
                className="flex flex-col items-center justify-center relative -top-3.5 group cursor-pointer"
                title="Post New Event"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-sky-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/30 ring-4 ring-white group-active:scale-95 transition-all">
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-sky-700 mt-1">{label}</span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleLinkClick(e, href, isProtected)}
              className={cn(
                "flex flex-col items-center justify-center w-full py-1 text-xs transition-all duration-150 cursor-pointer select-none",
                isActive ? "text-sky-600 font-bold scale-105" : "text-slate-500 hover:text-slate-900 font-medium"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.4]" : "stroke-[1.8]")} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-sky-600 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavbar
