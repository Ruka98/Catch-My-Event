"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home, Map, PlusSquare, Bell, User } from "lucide-react"

const BottomNavbar = () => {
  const pathname = usePathname()

  const navItems = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/map", icon: Map, label: "Map" },
    { href: "/post-event", icon: PlusSquare, label: "Post" },
    { href: "/notifications", icon: Bell, label: "Notifications" },
    { href: "/profile", icon: User, label: "Profile" },
  ]

  // These paths should not show the bottom navbar
  const hiddenPaths = [
    "/login",
    "/signup",
    "/welcome",
    "/privacy-policy",
    "/terms",
    "/unauthorized",
  ]

  if (hiddenPaths.includes(pathname)) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 h-16">
      <div className="flex justify-around max-w-screen-md mx-auto h-full">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center w-full text-sm ${
                isActive ? "text-primary" : "text-muted-foreground"
              } hover:text-primary transition-colors`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNavbar
