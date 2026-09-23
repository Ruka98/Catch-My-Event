"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ShieldCheck, LogOut, User, Plus, Building2 } from "lucide-react"

const Header = () => {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-[1300] w-full border-b bg-background/95 shadow-xs backdrop-blur-md">
      <div className="container mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex justify-between items-center">
        {/* Brand Logo & Name */}
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <Image
              src="/logo.png"
              alt="Catch My Event Logo"
              width={32}
              height={32}
              className="rounded-lg shrink-0 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-base sm:text-lg tracking-tight leading-tight text-gray-900">
                Catch My Event
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:block leading-none mt-0.5">
                Catch all events near you
              </span>
            </div>
          </Link>
        </div>

        {/* Right Actions */}
        <div>
          {!user ? (
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              <Button asChild size="sm" variant="ghost" className="text-xs sm:text-sm px-2.5 sm:px-3">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700 text-xs sm:text-sm px-3 sm:px-4 font-semibold rounded-full">
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {/* Desktop Action Buttons */}
              <div className="hidden md:flex items-center space-x-2.5">
                {user.isAdmin && (
                  <Button asChild size="sm" variant="outline" className="border-sky-300 text-sky-700 hover:bg-sky-50 font-semibold gap-1.5">
                    <Link href="/admin">
                      <ShieldCheck className="h-4 w-4 text-sky-600" />
                      <span>Admin Center</span>
                    </Link>
                  </Button>
                )}
                <Button asChild size="sm" variant="default" className="bg-sky-600 hover:bg-sky-700 font-semibold rounded-full px-4">
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
                  <span>Logout</span>
                </Button>
              </div>

              {/* Mobile Actions (Compact + Dropdown) */}
              <div className="md:hidden flex items-center space-x-1.5">
                <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-700 text-xs font-semibold rounded-full px-3 h-8 gap-1">
                  <Link href="/post-event">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Post</span>
                  </Link>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                      aria-label="User menu"
                    >
                      <User className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 p-1.5 shadow-xl rounded-2xl border-gray-100 bg-white">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {user.user_metadata?.display_name || user.email || "My Account"}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                    </div>

                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2">
                      <Link href="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4 text-sky-600" />
                        <span className="text-xs font-semibold">My Profile</span>
                      </Link>
                    </DropdownMenuItem>

                    {user.isAdmin && (
                      <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2">
                        <Link href="/admin" className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-sky-600" />
                          <span className="text-xs font-semibold">Admin Center</span>
                        </Link>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2">
                      <Link href="/venues" className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-sky-600" />
                        <span className="text-xs font-semibold">Explore Places</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-1" />

                    <DropdownMenuItem
                      onClick={logout}
                      className="rounded-xl cursor-pointer py-2 text-red-600 focus:text-red-700 focus:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-semibold">Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
