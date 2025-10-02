"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useMemo, useState } from "react"
import { Calendar } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const supabase = useMemo(() => createClient(), [])

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")
    setError("")

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage("If an account with that email exists, a password reset link has been sent.")
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
              <CardTitle className="text-2xl text-center">Forgot Password</CardTitle>
              <CardDescription className="text-center">
                Enter your email to receive a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                    {isSubmitting ? "Sending..." : "Send Reset Link"}
                  </Button>
                </div>
                <div className="mt-6 text-center text-sm">
                  Remember your password?{" "}
                  <Link href="/auth/login" className="text-sky-600 hover:text-sky-700 underline underline-offset-4">
                    Sign in
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}