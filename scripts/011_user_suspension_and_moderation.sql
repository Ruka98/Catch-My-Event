-- ==============================================================================
-- CATCH-MY-EVENT: USER SUSPENSION & ANTI-BOT MODERATION SCHEMA
-- Migration: 011_user_suspension_and_moderation.sql
-- Description: Adds is_suspended, suspension_reason, and suspended_at to profiles.
--              Enforces RLS to block suspended accounts from inserting events.
--              Provides administrative RPC functions for suspending/unsuspending users.
-- Safe & Non-Destructive: Uses IF NOT EXISTS, preserving all existing data.
-- ==============================================================================

-- 1. ADD SUSPENSION COLUMNS TO PROFILES
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended);

-- 2. HELPER FUNCTION TO CHECK IF CALLER IS SUSPENDED
CREATE OR REPLACE FUNCTION public.is_suspended()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_suspended FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$;

-- 3. ENSURE RLS PREVENTS SUSPENDED USERS FROM POSTING EVENTS
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'events' AND policyname = 'Authenticated users can create events'
  ) THEN
    DROP POLICY "Authenticated users can create events" ON public.events;
  END IF;
END $$;

CREATE POLICY "Authenticated users can create events"
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id 
    AND NOT public.is_suspended()
  );

-- 4. RPC PROCEDURE: ADMIN SUSPEND USER & OPTIONALLY HIDE ALL EVENTS
CREATE OR REPLACE FUNCTION public.admin_suspend_user(
  target_user_id UUID,
  reason TEXT DEFAULT 'Automated Bot / Spammer',
  hide_events BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  events_hidden_count INTEGER := 0;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can suspend users.';
  END IF;

  -- Update profile suspension status
  UPDATE public.profiles
  SET 
    is_suspended = TRUE,
    suspension_reason = reason,
    suspended_at = NOW()
  WHERE id = target_user_id;

  -- Optionally hide all events published by this user
  IF hide_events THEN
    UPDATE public.events
    SET status = 'hidden'
    WHERE user_id = target_user_id AND status != 'hidden';
    
    GET DIAGNOSTICS events_hidden_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'events_hidden', events_hidden_count
  );
END;
$$;

-- 5. RPC PROCEDURE: ADMIN UNSUSPEND USER & OPTIONALLY RESTORE EVENTS
CREATE OR REPLACE FUNCTION public.admin_unsuspend_user(
  target_user_id UUID,
  restore_events BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  events_restored_count INTEGER := 0;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only platform administrators can unsuspend users.';
  END IF;

  -- Restore profile
  UPDATE public.profiles
  SET 
    is_suspended = FALSE,
    suspension_reason = NULL,
    suspended_at = NULL
  WHERE id = target_user_id;

  -- Optionally restore events
  IF restore_events THEN
    UPDATE public.events
    SET status = 'published'
    WHERE user_id = target_user_id AND status = 'hidden';

    GET DIAGNOSTICS events_restored_count = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'events_restored', events_restored_count
  );
END;
$$;
