-- ==============================================================================
-- CATCH-MY-EVENT: ADMIN DUPLICATE HANDLING & RLS MIGRATION
-- File: Catch-My-web/scripts/012_admin_duplicate_handling_and_rls.sql
-- ==============================================================================

-- 1. ADMIN COLUMNS ON PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';

CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Helper function: Returns true if caller is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT (is_admin = TRUE OR role IN ('admin', 'super_admin'))
      FROM public.profiles 
      WHERE id = auth.uid()
    ),
    FALSE
  );
$$;

-- 2. FIX STATUS CONSTRAINT ON EVENTS
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE public.events ADD CONSTRAINT events_status_check 
  CHECK (status IN ('draft', 'published', 'cancelled', 'completed', 'hidden', 'flagged'));

-- 3. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3.1 EVENTS POLICIES
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
DROP POLICY IF EXISTS "Users can view own events" ON public.events;
DROP POLICY IF EXISTS "Events select policy" ON public.events;

CREATE POLICY "Events select policy"
  ON public.events
  FOR SELECT
  USING (
    status = 'published' 
    OR auth.uid() = user_id 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can insert own events" ON public.events;
DROP POLICY IF EXISTS "Events insert policy" ON public.events;

CREATE POLICY "Events insert policy"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Admins can update any event" ON public.events;
DROP POLICY IF EXISTS "Admins and owners can update events" ON public.events;
DROP POLICY IF EXISTS "Events update policy" ON public.events;

CREATE POLICY "Events update policy"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own events" ON public.events;
DROP POLICY IF EXISTS "Admins can delete any event" ON public.events;
DROP POLICY IF EXISTS "Admins and owners can delete events" ON public.events;
DROP POLICY IF EXISTS "Events delete policy" ON public.events;

CREATE POLICY "Events delete policy"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 3.2 EVENT ATTENDEES POLICIES
DROP POLICY IF EXISTS "Anyone can view attendees" ON public.event_attendees;
DROP POLICY IF EXISTS "Anyone can view attendee counts" ON public.event_attendees;
DROP POLICY IF EXISTS "Attendees select policy" ON public.event_attendees;
CREATE POLICY "Attendees select policy" ON public.event_attendees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own attendance" ON public.event_attendees;
DROP POLICY IF EXISTS "Admins can manage any attendance" ON public.event_attendees;
DROP POLICY IF EXISTS "Attendees insert policy" ON public.event_attendees;
DROP POLICY IF EXISTS "Attendees update policy" ON public.event_attendees;
DROP POLICY IF EXISTS "Attendees delete policy" ON public.event_attendees;

CREATE POLICY "Attendees insert policy"
  ON public.event_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Attendees update policy"
  ON public.event_attendees
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Attendees delete policy"
  ON public.event_attendees
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 3.3 LIKES POLICIES
DROP POLICY IF EXISTS "Anyone can view likes" ON public.likes;
DROP POLICY IF EXISTS "Likes select policy" ON public.likes;
CREATE POLICY "Likes select policy" ON public.likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
DROP POLICY IF EXISTS "Admins can manage any likes" ON public.likes;
DROP POLICY IF EXISTS "Likes insert policy" ON public.likes;
DROP POLICY IF EXISTS "Likes delete policy" ON public.likes;

CREATE POLICY "Likes insert policy"
  ON public.likes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Likes delete policy"
  ON public.likes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 3.4 COMMENTS POLICIES
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view comments on published events" ON public.comments;
DROP POLICY IF EXISTS "Comments select policy" ON public.comments;
CREATE POLICY "Comments select policy" ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Comments insert policy" ON public.comments;

CREATE POLICY "Comments insert policy"
  ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Comments update policy" ON public.comments;

CREATE POLICY "Comments update policy"
  ON public.comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can delete any comments" ON public.comments;
DROP POLICY IF EXISTS "Comments delete policy" ON public.comments;

CREATE POLICY "Comments delete policy"
  ON public.comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- 3.5 PROFILES POLICIES
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select policy" ON public.profiles;
CREATE POLICY "Profiles select policy" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update policy" ON public.profiles;

CREATE POLICY "Profiles update policy"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- 4. ATOMIC MERGE RPC FUNCTION
CREATE OR REPLACE FUNCTION public.admin_merge_events(
  primary_id UUID,
  duplicate_id UUID,
  override_title TEXT DEFAULT NULL,
  override_image TEXT DEFAULT NULL,
  override_venue TEXT DEFAULT NULL,
  override_lat NUMERIC DEFAULT NULL,
  override_lng NUMERIC DEFAULT NULL,
  hard_delete BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attendees_moved INTEGER := 0;
  likes_moved INTEGER := 0;
  comments_moved INTEGER := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can merge duplicate events.';
  END IF;

  -- 1. Transfer attendees
  INSERT INTO public.event_attendees (event_id, user_id, status, created_at)
  SELECT primary_id, user_id, status, created_at
  FROM public.event_attendees
  WHERE event_id = duplicate_id
  ON CONFLICT (event_id, user_id) DO NOTHING;
  GET DIAGNOSTICS attendees_moved = ROW_COUNT;

  DELETE FROM public.event_attendees WHERE event_id = duplicate_id;

  -- 2. Transfer likes
  INSERT INTO public.likes (event_id, user_id, created_at)
  SELECT primary_id, user_id, created_at
  FROM public.likes
  WHERE event_id = duplicate_id
  ON CONFLICT (event_id, user_id) DO NOTHING;
  GET DIAGNOSTICS likes_moved = ROW_COUNT;

  DELETE FROM public.likes WHERE event_id = duplicate_id;

  -- 3. Transfer comments
  UPDATE public.comments
  SET event_id = primary_id
  WHERE event_id = duplicate_id;
  GET DIAGNOSTICS comments_moved = ROW_COUNT;

  -- 4. Apply overrides to primary event
  UPDATE public.events
  SET
    title = COALESCE(override_title, title),
    image_url = COALESCE(override_image, image_url),
    venue = COALESCE(override_venue, venue),
    latitude = COALESCE(override_lat, latitude),
    longitude = COALESCE(override_lng, longitude),
    updated_at = NOW()
  WHERE id = primary_id;

  -- Recalculate like count
  UPDATE public.events
  SET like_count = (SELECT COUNT(*) FROM public.likes WHERE event_id = primary_id)
  WHERE id = primary_id;

  -- 5. Delete or hide duplicate
  IF hard_delete THEN
    DELETE FROM public.events WHERE id = duplicate_id;
  ELSE
    UPDATE public.events
    SET 
      status = 'hidden',
      updated_at = NOW()
    WHERE id = duplicate_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'primary_id', primary_id,
    'duplicate_id', duplicate_id,
    'attendees_transferred', attendees_moved,
    'likes_transferred', likes_moved,
    'comments_transferred', comments_moved,
    'action', CASE WHEN hard_delete THEN 'deleted' ELSE 'hidden' END
  );
END;
$$;

-- 5. ATOMIC DELETE RPC FUNCTION
CREATE OR REPLACE FUNCTION public.admin_delete_event(
  target_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can delete events.';
  END IF;

  DELETE FROM public.event_attendees WHERE event_id = target_event_id;
  DELETE FROM public.likes WHERE event_id = target_event_id;
  DELETE FROM public.comments WHERE event_id = target_event_id;
  DELETE FROM public.events WHERE id = target_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_event_id', target_event_id
  );
END;
$$;

-- 6. PROMOTE TO ADMIN FUNCTION
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  IF target_user_id IS NULL THEN
    RETURN 'User with email ' || target_email || ' not found in auth.users.';
  END IF;

  UPDATE public.profiles
  SET 
    is_admin = TRUE,
    role = 'admin'
  WHERE id = target_user_id;

  RETURN 'Successfully promoted ' || target_email || ' to Admin!';
END;
$$;

-- 7. EXECUTE ADMIN PROMOTION
SELECT public.promote_to_admin('kavindurukmal@gmail.com');
