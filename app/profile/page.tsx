"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-guard";
import { Loader2 } from "lucide-react";

export default function MyProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace(`/profile/${user.id}`);
      } else {
        router.replace("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
    </div>
  );
}