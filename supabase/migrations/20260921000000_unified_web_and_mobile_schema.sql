-- =============================================================================
-- CATCH MY EVENT - UNIFIED SAFE MIGRATION SCRIPT (WEB & MOBILE)
-- File: Catch-My-web/supabase/migrations/20260921000000_unified_web_and_mobile_schema.sql
-- 
-- Safe to run multiple times. Does NOT delete or truncate any existing data.
-- Aligns database schema for both Next.js Web App and Expo Mobile App.
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 2. PROFILES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT UNIQUE,
  display_name TEXT,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  location TEXT,
  website TEXT,
  mobile_number TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin')),
  reputation_score INTEGER NOT NULL DEFAULT 0,
  total_events_posted INTEGER NOT NULL DEFAULT 0,
  total_events_attended INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mobile_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_events_posted INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_events_attended INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- 3. EVENTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  date DATE NOT NULL,
  end_date DATE,
  time TEXT,
  start_time TIMESTAMPTZ,
  venue TEXT,
  location TEXT,
  address TEXT,
  city TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_attendees INTEGER,
  image_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'cancelled', 'completed')),
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  views INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID,
  profile_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all event columns exist
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS time TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_attendees INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Safely ensure foreign keys exist between events and profiles
DO $$
BEGIN
  -- Link user_id to profiles(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_user_id_fkey' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events 
    ADD CONSTRAINT events_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  -- Link profile_id to profiles(id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'events_profile_id_fkey' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events 
    ADD CONSTRAINT events_profile_id_fkey 
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. INTERACTION TABLES (ATTENDEES, LIKES, COMMENTS, NOTIFICATIONS, ROLES)
-- -----------------------------------------------------------------------------

-- Event Attendees
CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'attending', 'both', 'not_attending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comment Likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  type TEXT,
  payload JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Event Ratings
CREATE TABLE IF NOT EXISTS public.user_event_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_categories TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  preferred_locations TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  max_price NUMERIC(10,2),
  max_distance_km INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Event Recommendations
CREATE TABLE IF NOT EXISTS public.event_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  score NUMERIC(5,3) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Populate base categories safely
INSERT INTO public.categories (name) VALUES
  ('Music'),
  ('Performing Arts'),
  ('Visual Arts'),
  ('Food & Drink'),
  ('Sports & Fitness'),
  ('Nightlife'),
  ('Community'),
  ('Entertainment'),
  ('Education & Learning'),
  ('Social & Community'),
  ('Celebrations & Lifestyle'),
  ('Business & Professional')
ON CONFLICT (name) DO NOTHING;

-- User Roles and Permissions System
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

INSERT INTO public.user_roles (name, description, permissions) VALUES
('user', 'Regular user with basic permissions', ARRAY[
  'events:view', 'events:create', 'events:update_own', 'events:delete_own',
  'comments:create', 'comments:update_own', 'comments:delete_own',
  'profile:update_own', 'attendance:manage_own'
]),
('moderator', 'Moderator with content management permissions', ARRAY[
  'events:view', 'events:create', 'events:update_own', 'events:update_any',
  'events:delete_own', 'events:moderate', 'comments:create', 'comments:update_own',
  'comments:update_any', 'comments:delete_own', 'comments:delete_any',
  'comments:moderate', 'profile:update_own', 'profile:view_any',
  'attendance:manage_own', 'users:moderate'
]),
('admin', 'Administrator with full content and user management', ARRAY[
  'events:view', 'events:create', 'events:update_own', 'events:update_any',
  'events:delete_own', 'events:delete_any', 'events:moderate', 'events:feature',
  'comments:create', 'comments:update_own', 'comments:update_any',
  'comments:delete_own', 'comments:delete_any', 'comments:moderate',
  'profile:update_own', 'profile:update_any', 'profile:view_any',
  'attendance:manage_own', 'attendance:view_any', 'users:manage',
  'users:moderate', 'analytics:view'
]),
('super_admin', 'Super administrator with all permissions', ARRAY[
  'events:*', 'comments:*', 'profile:*', 'attendance:*', 'users:*', 'roles:*', 'analytics:*', 'system:*'
])
ON CONFLICT (name) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_subcategory ON public.events(subcategory);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_profile_id ON public.events(profile_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user ON public.event_attendees(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_likes_event_user ON public.likes(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_event_id ON public.comments(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, read);

-- -----------------------------------------------------------------------------
-- 6. RPC FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------

-- 6.1 Automatic Profile Creation on User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default user preferences
  INSERT INTO public.user_preferences (user_id, preferred_categories, preferred_locations, max_price)
  VALUES (
    NEW.id,
    ARRAY['Music', 'Technology', 'Food']::TEXT[],
    ARRAY['Colombo']::TEXT[],
    5000.00
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 6.2 Increment Event Views RPC
CREATE OR REPLACE FUNCTION public.increment_event_views(event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.events
  SET views = COALESCE(views, 0) + 1
  WHERE id = event_id;
END;
$$;

-- 6.3 Update Event Like Count Automatically
CREATE OR REPLACE FUNCTION public.update_event_like_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events
    SET like_count = COALESCE(like_count, 0) + 1
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events
    SET like_count = GREATEST(COALESCE(like_count, 1) - 1, 0)
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_like_count();

-- 6.4 Notification on Like Trigger
CREATE OR REPLACE FUNCTION public.handle_new_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_owner_id UUID;
BEGIN
  SELECT user_id INTO event_owner_id FROM public.events WHERE id = NEW.event_id;
  IF event_owner_id IS NOT NULL AND NEW.user_id <> event_owner_id THEN
    INSERT INTO public.notifications (user_id, actor_id, event_id, type, payload)
    VALUES (
      event_owner_id,
      NEW.user_id,
      NEW.event_id,
      'event_like',
      jsonb_build_object('event_id', NEW.event_id, 'actor_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_like ON public.likes;
CREATE TRIGGER on_new_like
  AFTER INSERT ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_like();

-- 6.5 Notification on Attendee RSVP Trigger
CREATE OR REPLACE FUNCTION public.handle_new_attendee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_owner_id UUID;
BEGIN
  SELECT user_id INTO event_owner_id FROM public.events WHERE id = NEW.event_id;
  IF event_owner_id IS NOT NULL AND NEW.user_id <> event_owner_id AND NEW.status IN ('attending', 'both') THEN
    INSERT INTO public.notifications (user_id, actor_id, event_id, type, payload)
    VALUES (
      event_owner_id,
      NEW.user_id,
      NEW.event_id,
      'event_attendance',
      jsonb_build_object('event_id', NEW.event_id, 'actor_id', NEW.user_id, 'status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_attendee ON public.event_attendees;
CREATE TRIGGER on_new_attendee
  AFTER INSERT OR UPDATE ON public.event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_attendee();

-- 6.6 Notification on New Comment Trigger
CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  event_owner_id UUID;
BEGIN
  SELECT user_id INTO event_owner_id FROM public.events WHERE id = NEW.event_id;
  IF event_owner_id IS NOT NULL AND NEW.user_id <> event_owner_id THEN
    INSERT INTO public.notifications (user_id, actor_id, event_id, type, payload)
    VALUES (
      event_owner_id,
      NEW.user_id,
      NEW.event_id,
      'event_comment',
      jsonb_build_object('event_id', NEW.event_id, 'actor_id', NEW.user_id, 'comment_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_comment ON public.comments;
CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- 6.7 Recommendation Calculation RPC
CREATE OR REPLACE FUNCTION public.calculate_recommendations(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_prefs RECORD;
  event_rec RECORD;
  base_score DECIMAL(5,3);
  category_bonus DECIMAL(5,3);
  location_bonus DECIMAL(5,3);
  price_bonus DECIMAL(5,3);
  popularity_bonus DECIMAL(5,3);
  final_score DECIMAL(5,3);
BEGIN
  SELECT * INTO user_prefs FROM public.user_preferences WHERE user_id = target_user_id;
  
  IF user_prefs IS NULL THEN
    INSERT INTO public.user_preferences (user_id, preferred_categories, preferred_locations, max_price)
    VALUES (target_user_id, ARRAY['Music', 'Technology', 'Food']::TEXT[], ARRAY['Colombo']::TEXT[], 5000.00)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO user_prefs FROM public.user_preferences WHERE user_id = target_user_id;
  END IF;

  DELETE FROM public.event_recommendations WHERE user_id = target_user_id;

  FOR event_rec IN 
    SELECT e.*, COALESCE(e.views, 0) as event_views, COALESCE(e.like_count, 0) as event_likes
    FROM public.events e 
    WHERE e.status = 'published' AND e.date >= CURRENT_DATE
  LOOP
    base_score := 0.500;
    category_bonus := 0.000;
    location_bonus := 0.000;
    price_bonus := 0.000;
    popularity_bonus := 0.000;

    IF user_prefs.preferred_categories IS NOT NULL AND event_rec.category = ANY(user_prefs.preferred_categories) THEN
      category_bonus := 0.300;
    END IF;

    IF user_prefs.preferred_locations IS NOT NULL AND (event_rec.city = ANY(user_prefs.preferred_locations) OR event_rec.location = ANY(user_prefs.preferred_locations)) THEN
      location_bonus := 0.200;
    END IF;

    IF user_prefs.max_price IS NOT NULL AND event_rec.price <= user_prefs.max_price THEN
      price_bonus := 0.100;
    END IF;

    IF event_rec.event_views > 100 OR event_rec.event_likes > 10 THEN
      popularity_bonus := 0.100;
    END IF;

    final_score := LEAST(1.000, base_score + category_bonus + location_bonus + price_bonus + popularity_bonus);

    IF final_score > 0.600 THEN
      INSERT INTO public.event_recommendations (user_id, event_id, score, reason)
      VALUES (
        target_user_id,
        event_rec.id,
        final_score,
        CASE 
          WHEN category_bonus > 0 AND location_bonus > 0 THEN 'Matches your preferred category and location'
          WHEN category_bonus > 0 THEN 'Matches your preferred category'
          WHEN location_bonus > 0 THEN 'Happening in your area'
          WHEN popularity_bonus > 0 THEN 'Trending event'
          ELSE 'Recommended for you'
        END
      )
      ON CONFLICT (user_id, event_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_recommendations ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Events Policies
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
CREATE POLICY "Anyone can view published events" ON public.events FOR SELECT USING (status = 'published' OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own events" ON public.events;
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

-- Attendees Policies
DROP POLICY IF EXISTS "Anyone can view attendees" ON public.event_attendees;
CREATE POLICY "Anyone can view attendees" ON public.event_attendees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own attendance" ON public.event_attendees;
CREATE POLICY "Users can manage own attendance" ON public.event_attendees FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Likes Policies
DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
CREATE POLICY "Anyone can view likes" ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
CREATE POLICY "Users can manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments Policies
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Comment Likes Policies
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own comment likes" ON public.comment_likes;
CREATE POLICY "Users can manage own comment likes" ON public.comment_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Roles Policies
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);

-- Preferences & Recommendations Policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own recommendations" ON public.event_recommendations;
CREATE POLICY "Users can view own recommendations" ON public.event_recommendations FOR SELECT USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 8. STORAGE BUCKETS SETUP (FOR POSTERS & AVATARS)
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('event-posters', 'event-posters', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO UPDATE SET
  public = true;

-- Storage RLS: Public viewing of images
DROP POLICY IF EXISTS "Public view for event posters" ON storage.objects;
CREATE POLICY "Public view for event posters" ON storage.objects FOR SELECT USING (bucket_id = 'event-posters');

DROP POLICY IF EXISTS "Public view for avatars" ON storage.objects;
CREATE POLICY "Public view for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Storage RLS: Authenticated uploads
DROP POLICY IF EXISTS "Authenticated upload for event posters" ON storage.objects;
CREATE POLICY "Authenticated upload for event posters" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event-posters');

DROP POLICY IF EXISTS "Authenticated upload for avatars" ON storage.objects;
CREATE POLICY "Authenticated upload for avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
CREATE POLICY "Users can delete own images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id IN ('event-posters', 'avatars') AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

-- -----------------------------------------------------------------------------
-- 9. OPTIONAL: SAFE BACKFILL FOR EXISTING AUTH USERS MISSING PROFILES
-- -----------------------------------------------------------------------------
INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', raw_user_meta_data->>'full_name', email), ''
FROM auth.users
ON CONFLICT (id) DO NOTHING;
