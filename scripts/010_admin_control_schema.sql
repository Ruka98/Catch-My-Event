-- ==============================================================================
-- CATCH-MY-EVENT: ADMIN CONTROL CENTER MIGRATION
-- Migration: 010_admin_control_schema.sql
-- Description: Adds is_admin to profiles, is_featured and status to events,
--              and sets up RLS policies for admin management.
-- Safe & Non-Destructive: Uses IF NOT EXISTS, preserving all existing data.
-- ==============================================================================

-- 1. ADD ADMIN & MODERATION COLUMNS TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

-- 2. ADD FEATURED & STATUS COLUMNS TO EVENTS
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
CREATE INDEX IF NOT EXISTS idx_events_is_featured ON public.events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

-- 3. HELPER FUNCTION TO CHECK IF CURRENT CALLER IS ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 4. ADMIN RLS POLICIES FOR EVENTS
-- Admins can update any event (or the event owner via user_id)
DROP POLICY IF EXISTS "Admins can update any event" ON public.events;
CREATE POLICY "Admins can update any event"
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id)
  WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- Admins can delete any event (or the event owner via user_id)
DROP POLICY IF EXISTS "Admins can delete any event" ON public.events;
CREATE POLICY "Admins can delete any event"
  ON public.events
  FOR DELETE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = user_id);

-- 5. ADMIN RLS POLICIES FOR PROFILES
-- Admins can update any profile (e.g. promoting someone to admin or editing)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin() OR auth.uid() = id)
  WITH CHECK (public.is_admin() OR auth.uid() = id);

-- 6. CONVENIENCE PROCEDURE: PROMOTE USER TO ADMIN BY EMAIL
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;
  IF target_user_id IS NULL THEN
    RETURN 'User with email ' || target_email || ' not found in auth.users.';
  END IF;

  UPDATE public.profiles
  SET is_admin = TRUE
  WHERE id = target_user_id;

  RETURN 'Successfully promoted ' || target_email || ' to Admin!';
END;
$$;

-- 7. EXECUTE PROMOTION FOR YOUR ACCOUNT
SELECT public.promote_to_admin('kavindurukmal@gmail.com');
