import type { NextRequest } from "next/server";
export { middleware } from "@/lib/supabase/middleware";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..+).*)"],
};
