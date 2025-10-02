"use client";
import Link from "next/link";
import { useAuth } from "@/components/auth-guard";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="border-b bg-white">
      <nav className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">EventsLK</Link>
          <Link href="/events" className="text-sm text-gray-600 hover:text-black">Events</Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">Dashboard</Link>
          <Link href="/post-event" className="text-sm text-gray-600 hover:text-black">Post</Link>
        </div>
        <div className="flex items-center gap-3">
          {!loading && user ? (
            <>
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={signOut}
                className="text-sm px-3 py-1.5 rounded bg-black text-white"
                aria-label="Sign out"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="text-sm px-3 py-1.5 rounded bg-black text-white">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
