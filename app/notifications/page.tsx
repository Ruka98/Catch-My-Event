import { redirect } from "next/navigation";
import Notifications from "@/components/notifications";
import { SocialTopNav } from "@/components/navigation/social-top-nav";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: notifications /*, error */ } = await supabase
    .from("notifications")
    .select(
      `
      id,
      created_at,
      type,
      read,
      events (
        id,
        title
      ),
      profiles:actor_id (
        id,
        username
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <SocialTopNav active="notifications" />
      <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-6">
        <section className="space-y-6 rounded-3xl border border-sky-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Notifications
          </h1>
          {/* ✅ Never pass null */}
          <Notifications notifications={notifications ?? []} />
        </section>
      </main>
    </div>
  );
}
