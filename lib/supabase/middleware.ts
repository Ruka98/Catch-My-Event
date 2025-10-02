import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATHS: (string | RegExp)[] = [
  "/",
  "/map",
  "/calendar",
  "/events",
  /^\/events\/[^/]+$/,
  "/welcome",
  "/auth/login",
  "/auth/signup",
  "/auth/signup-success",
  "/auth/callback",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/login",
  "/signup",
  "/unauthorized",
  "/auth/finish-profile", // Allow access to finish-profile page
]

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => (p instanceof RegExp ? p.test(pathname) : p === pathname))
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let response = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseAnonKey) return response

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const url = request.nextUrl.clone()
  const { pathname } = url

  // Allow access to static files and API routes
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) {
    return response
  }

  // If user is logged in and tries to access login/signup, redirect to dashboard
  if (user && (pathname === "/auth/login" || pathname === "/auth/signup")) {
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // From here, all routes are either public or require authentication
  if (isPublic(pathname)) {
    return response
  }

  // If not logged in and trying to access a private route, redirect to login
  if (!user) {
    url.pathname = "/auth/login"
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  // User is logged in, check for profile completion.
  // This is for users who signed up via OAuth and need to provide a username.
  const { data: profile } = await supabase.from("profiles").select("user_name").eq("id", user.id).single()

  const isProfileComplete = !!profile?.user_name

  if (!isProfileComplete) {
    // If the profile is not complete, redirect to the finish-profile page.
    url.pathname = "/auth/finish-profile"
    return NextResponse.redirect(url)
  }

  // Profile is complete, allow access to the private route.
  return response
}