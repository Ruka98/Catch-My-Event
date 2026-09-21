-- Add user roles and permissions system

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_role_assignments table
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.user_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);

-- Add role field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'super_admin'));

-- Enable RLS on new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Insert default roles
INSERT INTO public.user_roles (name, description, permissions) VALUES
('user', 'Regular user with basic permissions', ARRAY[
  'events:view',
  'events:create',
  'events:update_own',
  'events:delete_own',
  'comments:create',
  'comments:update_own',
  'comments:delete_own',
  'profile:update_own',
  'attendance:manage_own'
]),
('moderator', 'Moderator with content management permissions', ARRAY[
  'events:view',
  'events:create',
  'events:update_own',
  'events:update_any',
  'events:delete_own',
  'events:moderate',
  'comments:create',
  'comments:update_own',
  'comments:update_any',
  'comments:delete_own',
  'comments:delete_any',
  'comments:moderate',
  'profile:update_own',
  'profile:view_any',
  'attendance:manage_own',
  'users:moderate'
]),
('admin', 'Administrator with full content and user management', ARRAY[
  'events:view',
  'events:create',
  'events:update_own',
  'events:update_any',
  'events:delete_own',
  'events:delete_any',
  'events:moderate',
  'events:feature',
  'comments:create',
  'comments:update_own',
  'comments:update_any',
  'comments:delete_own',
  'comments:delete_any',
  'comments:moderate',
  'profile:update_own',
  'profile:update_any',
  'profile:view_any',
  'attendance:manage_own',
  'attendance:view_any',
  'users:manage',
  'users:moderate',
  'analytics:view'
]),
('super_admin', 'Super administrator with all permissions', ARRAY[
  'events:*',
  'comments:*',
  'profile:*',
  'attendance:*',
  'users:*',
  'roles:*',
  'analytics:*',
  'system:*'
])
ON CONFLICT (name) DO NOTHING;

-- RLS Policies for user_roles table
CREATE POLICY "Anyone can view roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Only admins can manage roles" ON public.user_roles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- RLS Policies for user_role_assignments table
CREATE POLICY "Users can view own role assignments" ON public.user_role_assignments FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Only admins can manage role assignments" ON public.user_role_assignments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Create function to check user permissions
CREATE OR REPLACE FUNCTION public.user_has_permission(user_id UUID, permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_permissions TEXT[];
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  
  -- If no role found, default to 'user'
  IF user_role IS NULL THEN
    user_role := 'user';
  END IF;
  
  -- Get role permissions
  SELECT permissions INTO role_permissions FROM public.user_roles WHERE name = user_role;
  
  -- Check if user has the specific permission or wildcard permission
  RETURN (
    permission = ANY(role_permissions) OR
    (permission LIKE '%:%' AND CONCAT(SPLIT_PART(permission, ':', 1), ':*') = ANY(role_permissions)) OR
    '*' = ANY(role_permissions)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = user_id;
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies to use permission system

-- Enhanced events policies
DROP POLICY IF EXISTS "Users can update own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events" ON public.events;

CREATE POLICY "Users can update events based on permissions" ON public.events FOR UPDATE USING (
  (auth.uid() = user_id AND public.user_has_permission(auth.uid(), 'events:update_own')) OR
  public.user_has_permission(auth.uid(), 'events:update_any')
);

CREATE POLICY "Users can delete events based on permissions" ON public.events FOR DELETE USING (
  (auth.uid() = user_id AND public.user_has_permission(auth.uid(), 'events:delete_own')) OR
  public.user_has_permission(auth.uid(), 'events:delete_any')
);

-- Enhanced comments policies
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

CREATE POLICY "Users can update comments based on permissions" ON public.comments FOR UPDATE USING (
  (auth.uid() = user_id AND public.user_has_permission(auth.uid(), 'comments:update_own')) OR
  public.user_has_permission(auth.uid(), 'comments:update_any')
);

CREATE POLICY "Users can delete comments based on permissions" ON public.comments FOR DELETE USING (
  (auth.uid() = user_id AND public.user_has_permission(auth.uid(), 'comments:delete_own')) OR
  public.user_has_permission(auth.uid(), 'comments:delete_any')
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments(role_id);
