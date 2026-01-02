import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-red-200 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-red-600">Authentication Error</CardTitle>
            <CardDescription className="text-center">
              There was a problem signing you in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-center text-gray-600">
              The link you used may be invalid or expired. Please try signing in again.
            </p>
            <Button asChild className="w-full bg-sky-600 hover:bg-sky-700">
              <Link href="/auth/login">
                Return to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
