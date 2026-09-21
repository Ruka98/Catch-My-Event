"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Home, Map, PlusSquare, Bell, User } from "lucide-react"
import { useAuth } from "@/components/auth-guard"
import { useCallback } from "react"

const BottomNavbar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useAuth()

  const navItems = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/map", icon: Map, label: "Map" },
    { href: "/post-event", icon: PlusSquare, label: "Post", protected: true },
    { href: "/notifications", icon: Bell, label: "Notifications", protected: true },
    { href: "/profile", icon: User, label: "Profile", protected: true },
  ].filter((item) => !item.protected || user)

  const hiddenPaths = [
    "/login",
    "/signup",
    "/welcome",
    "/privacy-policy",
    "/terms",
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

  if (hiddenPaths.includes(pathname) || loading) {
    return null
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50 h-16">
      <div className="flex justify-around max-w-screen-md mx-auto h-full">
        {navItems.map(({ href, icon: Icon, label, protected: isProtected }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => handleLinkClick(e, href, isProtected)}
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
