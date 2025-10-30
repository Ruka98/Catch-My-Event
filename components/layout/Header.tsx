"use client"

import Link from "next/link"
import Image from "next/image"
import { useAuth } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"

const Header = () => {
  const { user } = useAuth()

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
          {!user && (
            <div className="flex items-center space-x-2">
              <Button asChild variant="ghost">
                <Link href="/auth/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
