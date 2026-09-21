-- 1) Ensure extensions -----------------------------------------------------
-- Use pgcrypto for gen_random_uuid(); uuid-ossp is not required if gen_random_uuid() is used.
create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- 2) Profiles extend auth.users -------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_name text unique,
  display_name text,
  full_name text,
  bio text,
  avatar_url text,
  location text,
  website text,
  mobile_number text,
  reputation_score integer not null default 0,
  total_events_posted integer not null default 0,
  total_events_attended integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Events ---------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  date date not null,
  time text,
  start_time timestamptz,
  venue text,
  location text,
  address text,
  city text,
  price numeric(10,2) not null default 0,
  max_attendees integer,
  image_url text,
  website_url text,
  contact_email text,
  contact_phone text,
  latitude numeric,
  longitude numeric,
  status text not null default 'published' check (status in ('draft', 'published', 'cancelled', 'completed')),
  featured boolean not null default false,
  views integer not null default 0,
  like_count integer not null default 0,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) Attendees, comments, likes, ratings, prefs, recommendations ----------
create table if not exists public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'interested' check (status in ('interested', 'attending', 'both', 'not_attending')),
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table if not exists public.comment_likes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(comment_id, user_id)
);

create table if not exists public.user_event_ratings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  preferred_categories text[] not null default '{}'::text[],
  preferred_locations text[] not null default '{}'::text[],
  max_price numeric(10,2),
  max_distance_km integer default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.event_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  score numeric(5,3) not null,
  reason text,
  created_at timestamptz not null default now(),
  unique(user_id, event_id)
);

-- 5) Categories & interests -----------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.user_interests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_id)
);

-- 6) Notifications --------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  type text,
  payload jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 7) Indexes --------------------------------------------------------------
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_events_location on public.events(location);
create index if not exists idx_events_category on public.events(category);
create index if not exists idx_events_user_id on public.events(user_id);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_comments_event_id on public.comments(event_id);
create index if not exists idx_event_attendees_event_id on public.event_attendees(event_id);
create index if not exists idx_event_attendees_user_id on public.event_attendees(user_id);
create index if not exists idx_event_recommendations_user_id on public.event_recommendations(user_id);
create index if not exists idx_event_recommendations_score on public.event_recommendations(score desc);

-- 8) Enable Row Level Security -------------------------------------------
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.comment_likes enable row level security;
alter table public.user_event_ratings enable row level security;
alter table public.user_preferences enable row level security;
alter table public.event_recommendations enable row level security;
alter table public.categories enable row level security;
alter table public.user_interests enable row level security;
alter table public.notifications enable row level security;

-- 9) Updated_at trigger helper -------------------------------------------
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_profiles_updated_at on public.profiles;
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_events_updated_at on public.events;
create trigger update_events_updated_at
  before update on public.events
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_comments_updated_at on public.comments;
create trigger update_comments_updated_at
  before update on public.comments
  for each row execute procedure public.update_updated_at_column();

drop trigger if exists update_user_preferences_updated_at on public.user_preferences;
create trigger update_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute procedure public.update_updated_at_column();

-- 10) handle_new_user trigger & function ----------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert or update profile from auth.users meta
  insert into public.profiles (id, user_name, display_name, full_name, avatar_url, mobile_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'mobile_number'
  )
  on conflict (id) do update set
    user_name = coalesce(excluded.user_name, public.profiles.user_name),
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    mobile_number = coalesce(excluded.mobile_number, public.profiles.mobile_number);

  -- Ensure preferences exist
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Correct DROP/CREATE trigger syntax on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11) Like counter maintenance -------------------------------------------
create or replace function public.update_event_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.events set like_count = coalesce(like_count,0) + 1 where id = new.event_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.events set like_count = greatest(coalesce(like_count,0) - 1, 0) where id = old.event_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists on_like_change on public.likes;
create trigger on_like_change
  after insert or delete on public.likes
  for each row execute procedure public.update_event_like_count();

-- 12) Increment view RPC --------------------------------------------------
create or replace function public.increment_event_views(event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.events
  set views = coalesce(views, 0) + 1
  where id = event_id;
end;
$$;

-- 13) Recommendations: set-based implementation ----------------------------
-- This implementation computes scores in a single statement for better performance.
create or replace function public.calculate_recommendations(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure preferences row exists
  insert into public.user_preferences (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  -- Remove previous recommendations
  delete from public.event_recommendations where user_id = target_user_id;

  -- Insert new recommendations using a set-based approach
  insert into public.event_recommendations (user_id, event_id, score, reason)
  select
    prefs.user_id,
    e.id as event_id,
    -- compute score components
    greatest(
      0,
      least(
        1,
        0.3
        + (case when prefs.preferred_categories @> array[e.category] then 0.3 else 0 end)
        + (case when prefs.preferred_locations @> array[e.location] then 0.2 else 0 end)
        + (case when prefs.max_price is null or e.price <= prefs.max_price then 0.1 else -0.2 end)
        + least(0.1, (coalesce(att.attendee_count,0) * 0.01) + (coalesce(avg_rating.avg_rating,0) * 0.02))
      )
    ) as final_score,
    case
      when (prefs.preferred_categories @> array[e.category]) and (prefs.preferred_locations @> array[e.location]) then 'Matches your preferred category and location'
      when (prefs.preferred_categories @> array[e.category]) then 'Matches your preferred category'
      when (prefs.preferred_locations @> array[e.location]) then 'In your preferred location'
      when (least(0.1, (coalesce(att.attendee_count,0) * 0.01) + (coalesce(avg_rating.avg_rating,0) * 0.02)) > 0.05) then 'Popular with other attendees'
      else 'Recommended for you'
    end as reason
  from public.user_preferences prefs
  cross join lateral (
    select *
    from public.events
    where status = 'published'
      and date >= current_date
      and user_id is distinct from target_user_id
      and not exists (
        select 1 from public.event_attendees ea2
        where ea2.event_id = public.events.id and ea2.user_id = target_user_id and ea2.status in ('attending','both','interested')
      )
  ) e
  left join lateral (
    select count(ea.id) filter (where ea.status in ('attending','both')) as attendee_count
    from public.event_attendees ea
    where ea.event_id = e.id
  ) att on true
  left join lateral (
    select coalesce(avg(r.rating),0) as avg_rating
    from public.user_event_ratings r
    where r.event_id = e.id
  ) avg_rating on true
  where prefs.user_id = target_user_id
    -- compute final_score in HAVING-like fashion: only insert if score >= 0.3
    and greatest(
      0,
      least(
        1,
        0.3
        + (case when prefs.preferred_categories @> array[e.category] then 0.3 else 0 end)
        + (case when prefs.preferred_locations @> array[e.location] then 0.2 else 0 end)
        + (case when prefs.max_price is null or e.price <= prefs.max_price then 0.1 else -0.2 end)
        + least(0.1, (coalesce(att.attendee_count,0) * 0.01) + (coalesce(avg_rating.avg_rating,0) * 0.02))
      )
    ) >= 0.30
  on conflict (user_id, event_id) do update set score = excluded.score, reason = excluded.reason;
end;
$$;

-- 14) Recommendations view -------------------------------------------------
create or replace view public.recommendations as
select * from public.event_recommendations;

-- 15) RLS policies ---------------------------------------------------------
-- Note: use (SELECT auth.uid()) form for better planner behavior and stability.

-- Profiles
drop policy if exists "Public profiles are viewable" on public.profiles;
create policy "Public profiles are viewable"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ((SELECT auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using ((SELECT auth.uid()) = id);

-- Events
drop policy if exists "Published events are viewable by everyone" on public.events;
create policy "Published events are viewable by everyone"
  on public.events for select
  using (status = 'published');

drop policy if exists "Users can insert their own events" on public.events;
create policy "Users can insert their own events"
  on public.events for insert
  with check ((SELECT auth.uid()) = user_id);

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events"
  on public.events for update
  using ((SELECT auth.uid()) = user_id);

drop policy if exists "Users can delete their own events" on public.events;
create policy "Users can delete their own events"
  on public.events for delete
  using ((SELECT auth.uid()) = user_id);

-- Event attendees
drop policy if exists "View event attendees" on public.event_attendees;
create policy "View event attendees"
  on public.event_attendees for select
  using (true);

drop policy if exists "Manage own attendance" on public.event_attendees;
create policy "Manage own attendance"
  on public.event_attendees for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Comments
drop policy if exists "View event comments" on public.comments;
create policy "View event comments"
  on public.comments for select
  using (true);

drop policy if exists "Manage own comments" on public.comments;
create policy "Manage own comments"
  on public.comments for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Likes
drop policy if exists "View event likes" on public.likes;
create policy "View event likes"
  on public.likes for select using (true);

drop policy if exists "Manage own likes" on public.likes;
create policy "Manage own likes"
  on public.likes for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Comment likes
drop policy if exists "View comment likes" on public.comment_likes;
create policy "View comment likes"
  on public.comment_likes for select using (true);

drop policy if exists "Manage own comment likes" on public.comment_likes;
create policy "Manage own comment likes"
  on public.comment_likes for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Ratings
drop policy if exists "View ratings" on public.user_event_ratings;
create policy "View ratings"
  on public.user_event_ratings for select using (true);

drop policy if exists "Manage own ratings" on public.user_event_ratings;
create policy "Manage own ratings"
  on public.user_event_ratings for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- User preferences
drop policy if exists "Manage own preferences" on public.user_preferences;
create policy "Manage own preferences"
  on public.user_preferences for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Event recommendations
drop policy if exists "Manage own recommendations" on public.event_recommendations;
create policy "Manage own recommendations"
  on public.event_recommendations for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Categories (force RLS to ensure all access goes through policies)
alter table public.categories force row level security;
drop policy if exists "Read categories" on public.categories;
create policy "Read categories"
  on public.categories for select using (true);

-- User interests
drop policy if exists "Manage user interests" on public.user_interests;
create policy "Manage user interests"
  on public.user_interests for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- Notifications
drop policy if exists "Manage notifications" on public.notifications;
create policy "Manage notifications"
  on public.notifications for all
  using ((SELECT auth.uid()) = user_id)
  with check ((SELECT auth.uid()) = user_id);

-- 16) Storage buckets & RLS -----------------------------------------------
-- Create storage buckets if they don't exist (safe upsert)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-posters', 'event-posters', true, 5242880, '{"image/jpeg","image/png","image/webp"}'),
  ('avatars', 'avatars', true, 1048576, '{"image/jpeg","image/png","image/webp"}')
on conflict (id) do nothing;

-- RLS on storage.objects for event-posters
drop policy if exists "Event posters are publicly viewable" on storage.objects;
create policy "Event posters are publicly viewable"
  on storage.objects for select
  using ( bucket_id = 'event-posters' );

drop policy if exists "Authenticated users can upload event posters" on storage.objects;
create policy "Authenticated users can upload event posters"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'event-posters' );

drop policy if exists "Users can update their own event posters" on storage.objects;
create policy "Users can update their own event posters"
  on storage.objects for update
  using (
    bucket_id = 'event-posters'
    and (storage.foldername(name) is not null)
    and (array_length(storage.foldername(name),1) >= 1)
    and ((storage.foldername(name))[1] = (SELECT auth.uid())::text)
  );

drop policy if exists "Users can delete their own event posters" on storage.objects;
create policy "Users can delete their own event posters"
  on storage.objects for delete
  using (
    bucket_id = 'event-posters'
    and (storage.foldername(name) is not null)
    and (array_length(storage.foldername(name),1) >= 1)
    and ((storage.foldername(name))[1] = (SELECT auth.uid())::text)
  );

-- RLS on storage.objects for avatars
drop policy if exists "Avatars are publicly viewable" on storage.objects;
create policy "Avatars are publicly viewable"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name) is not null)
    and (array_length(storage.foldername(name),1) >= 1)
    and ((storage.foldername(name))[1] = (SELECT auth.uid())::text)
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name) is not null)
    and (array_length(storage.foldername(name),1) >= 1)
    and ((storage.foldername(name))[1] = (SELECT auth.uid())::text)
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name) is not null)
    and (array_length(storage.foldername(name),1) >= 1)
    and ((storage.foldername(name))[1] = (SELECT auth.uid())::text)
  );

-- 17) Seed base categories -----------------------------------------------
insert into public.categories (name)
values
  ('Entertainment'),
  ('Arts & Culture'),
  ('Sports & Fitness'),
  ('Food & Drink'),
  ('Education & Learning'),
  ('Social & Community'),
  ('Celebrations & Lifestyle'),
  ('Business & Professional')
on conflict (name) do nothing;

-- 18) Archival instead of hard delete: archived_events table & cron job
create table if not exists public.archived_events as
select * from public.events
where false; -- create empty table with same structure (no data)

alter table public.archived_events
  add column archived_at timestamptz default now();

-- schedule a nightly cron job that moves (archives) old events older than 7 days
do $$
declare
  existing_job integer;
begin
  select jobid into existing_job
  from cron.job
  where jobname = 'archive-old-events';

  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'archive-old-events',
    '0 0 * * *',
    $cron$
      -- move to archive (copy then delete to preserve referential integrity; adjust as needed)
      with moved as (
        delete from public.events e
        using (
          select id from public.events where date < current_date - interval '7 days'
        ) d
        where e.id = d.id
        returning e.*
      )
      insert into public.archived_events (
        id, title, description, category, date, time, start_time, venue, location, address, city,
        price, max_attendees, image_url, website_url, contact_email, contact_phone, latitude, longitude,
        status, featured, views, like_count, user_id, created_at, updated_at, archived_at
      )
      select id, title, description, category, date, time, start_time, venue, location, address, city,
             price, max_attendees, image_url, website_url, contact_email, contact_phone, latitude, longitude,
             status, featured, views, like_count, user_id, created_at, updated_at, now()
      from moved;
    $cron$
  );
end;
$$;

-- End of migration
