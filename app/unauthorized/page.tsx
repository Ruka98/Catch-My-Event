"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, ArrowLeft, Home } from "lucide-react"
import Link from "next/link"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            You don't have permission to access this page. Please contact an administrator if you believe this is an
            error.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full bg-transparent">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Button variant="outline" onClick={() => window.history.back()} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
