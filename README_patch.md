# Events Feed & Profile (Owner Edit/Delete) Patch

This patch adds:
- **Feed (/)**: show **all events**
- **Profile (/profile)**: show **only my events** with **Edit**/**Delete**
- **Edit page**: `/events/[id]/edit`
- **Server actions**: update/delete with RLS protection
- **Supabase RLS policies**: public read; owner-only write

## 1) Apply SQL Policies
In Supabase SQL Editor, run `supabase_policies.sql` from this folder.
Make sure your event creation code sets `created_by = user.id`.

## 2) Drop these files into your project root
- `app/actions/events.ts`
- `app/page.tsx` (Feed)
- `app/profile/page.tsx`
- `app/events/[id]/edit/page.tsx`
- `lib/supabase/server.ts`
- `lib/supabase/client.ts`
- `types/supabase.ts` (or replace with your generated types)

## 3) Ensure your create-event code sets created_by
Example:
```ts
const { data: { user } } = await supabase.auth.getUser();
await supabase.from("events").insert({
  title, description, event_date, location, created_by: user!.id
});
```

## 4) Notes
- If your column names differ (e.g., `starts_at` vs `event_date`), adjust the code.
- If you want **auth-only** feed, change the select policy `to public` → `to authenticated`.
- These files assume `@/` alias is configured to project root in `tsconfig.json`.
