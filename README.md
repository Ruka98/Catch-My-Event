
# Events Supabase Fix Pack (v3)

- Restores consistent theme via a global `Navbar` placed in `app/layout.tsx`.
- Adds **Sign out** (Supabase) and fixes auth context.
- Ensures new events show up immediately by making listing pages **dynamic**.
- Keeps all helpers from v2 (search, recommendations, views RPC, attendance).

## Install
1. Copy files over your app (overwrite when asked).
2. Ensure `.env.local` has Supabase URL and anon key.
3. Run SQL in `supabase/migrations/2025-09-25_events.sql` if not already.
4. `npm i @supabase/ssr`
5. `npm run dev`
