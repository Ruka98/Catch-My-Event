"use client";

import { useEffect, useMemo, useState, useCallback, useContext, createContext } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type User = {
  id: string;
  email?: string | null;
  name?: string | null;
  avatar?: string | null;
  isAdmin?: boolean;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const s = useMemo(() => createClient(), []);

  const loadUser = useCallback(async () => {
    try {
      const { data } = await s.auth.getUser();
      const u = data.user;
      if (u) {
        let isAdmin = false;
        try {
          const { data: prof } = await s
            .from("profiles")
            .select("is_admin")
            .eq("id", u.id)
            .maybeSingle();
          if (prof?.is_admin) {
            isAdmin = true;
          }
        } catch {
          // ignore if column not yet queried
        }

        setUser({
          id: u.id,
          email: u.email,
          name: u.user_metadata?.name ?? u.email ?? "User",
          avatar: u.user_metadata?.avatar_url ?? null,
          isAdmin,
        });
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [s]);

  const router = useRouter()

  useEffect(() => {
    // initial
    loadUser();

    // keep in sync with auth events
    const { data: sub } = s.auth.onAuthStateChange((event, session) => {
      // reload user on any auth change
      setLoading(true);
      loadUser();
      if (event === "SIGNED_IN") {
        const redirect = sessionStorage.getItem("redirect")
        if (redirect) {
          sessionStorage.removeItem("redirect")
          router.replace(redirect)
        }
      }
      // keep server cookies in sync (so middleware sees the session)
      fetch("/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, session }),
      }).catch(() => {});
    });
    return () => sub.subscription?.unsubscribe();
  }, [s, loadUser, router]);

  const logout = useCallback(async () => {
    await s.auth.signOut();
    setUser(null);
  }, [s]);

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Route wrapper: only redirects if requireAuth=true AND user is not logged in */
export function AuthGuard({
  children,
  requireAuth = false,
}: {
  children: React.ReactNode;
  requireAuth?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && requireAuth && !user) {
      router.replace(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, requireAuth, user, router, pathname]);

  return <>{children}</>;
}

/** Route wrapper for Admin only pages */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/auth/login?redirect=/admin");
      } else if (!user.isAdmin) {
        router.replace("/unauthorized");
      }
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return <>{children}</>;
}
