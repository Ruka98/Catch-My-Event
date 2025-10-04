"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { Calendar } from "lucide-react"

export default function FinishProfilePage() {
  const [userName, setUserName] = useState("")
  const [mobileNumber, setMobileNumber] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/auth/login")
      }
    }
    checkUser()
  }, [router, supabase])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not found")

      // Update the user's profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          user_name: userName,
          mobile_number: mobileNumber,
          // You might want to set a flag here to indicate the profile is complete
          // is_profile_complete: true,
        })
        .eq("id", user.id)

      if (updateError) {
        if (updateError.message.includes("profiles_user_name_key")) {
          setError("User name is already taken.")
        } else {
          throw updateError
        }
      } else {
        router.replace("/profile")
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center justify-center space-x-2 mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Catch My Event</h1>
          </Link>

          <Card className="border-sky-200/70 shadow-sm backdrop-blur">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Finish Your Profile</CardTitle>
              <CardDescription className="text-center">
                Just a few more details to get you started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="userName">User name</Label>
                    <Input
                      id="userName"
                      type="text"
                      placeholder="Your unique user name"
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="border-sky-200 focus:border-sky-400 focus:ring-sky-400"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="mobileNumber">Mobile number</Label>
                    <Input
                      id="mobileNumber"
                      type="tel"
                      placeholder="Your mobile number"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="border-sky-200 focus:border-sky-400 focus:ring-sky-400"
                    />
                  </div>
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
                  )}
                  <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Complete Profile"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}