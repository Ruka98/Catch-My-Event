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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        // The user is in the password recovery flow
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setIsSubmitting(true)
    setMessage("")
    setError("")

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setMessage("Your password has been reset successfully.")
      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    }
    setIsSubmitting(false)
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
              <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
              <CardDescription className="text-center">
                Enter your new password below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleResetPassword}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter new password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="border-sky-200 focus:border-sky-400 focus:ring-sky-400"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-sky-200 focus:border-sky-400 focus:ring-sky-400"
                    />
                  </div>
                  {message && (
                    <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg">{message}</div>
                  )}
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">{error}</div>
                  )}
                  <Button type="submit" className="w-full bg-sky-600 hover:bg-sky-700" disabled={isSubmitting}>
                    {isSubmitting ? "Resetting..." : "Reset Password"}
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