"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"

import { ShieldCheck, LogOut } from "lucide-react"

const Header = () => {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-[1300] w-full border-b bg-background/95 shadow-sm backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2">
          <Image src="/logo.png" alt="Catch My Event Logo" width={32} height={32} />
          <div className="flex flex-col">
            <span className="font-bold text-lg">Catch My Event</span>
            <span className="text-xs text-muted-foreground">Catch all events near you</span>
          </div>
        </Link>
        <div>
          {!user ? (
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user.isAdmin && (
                <Button asChild size="sm" variant="outline" className="border-sky-300 text-sky-700 hover:bg-sky-50 font-semibold gap-1.5">
                  <Link href="/admin">
                    <ShieldCheck className="h-4 w-4 text-sky-600" />
                    <span className="hidden sm:inline">Admin Center</span>
                  </Link>
                </Button>
              )}
              <Button asChild size="sm" variant="default" className="bg-sky-600 hover:bg-sky-700">
                <Link href="/post-event">+ Post Event</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/profile">Profile</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={logout}
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-1.5 cursor-pointer"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
