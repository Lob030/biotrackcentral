-- Fix Workspace Membership and RLS Visibility
-- 
-- This migration ensures that every workspace creator is automatically added
-- as a member of the workspace, enabling RLS policies to function correctly.

-- 1. Create workspace_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- Enable RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace members policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
CREATE POLICY "Users can view their own memberships"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Trigger to auto-add creator to workspace_members
CREATE OR REPLACE FUNCTION public.handle_new_workspace_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_member();

-- 3. Backfill existing workspaces
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'admin' FROM public.workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 4. Update RLS policies for Species Profiles to be more resilient
-- We add a fallback to check workspaces.user_id directly

DROP POLICY IF EXISTS workspace_species_profiles_view ON public.workspace_species_profiles;
CREATE POLICY workspace_species_profiles_view ON public.workspace_species_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_species_profiles.workspace_id
      AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_species_profiles_insert ON public.workspace_species_profiles;
CREATE POLICY workspace_species_profiles_insert ON public.workspace_species_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_species_profiles.workspace_id
      AND w.user_id = auth.uid()
    )
  );

-- Repeat for size classes
DROP POLICY IF EXISTS species_size_classes_view ON public.species_size_classes;
CREATE POLICY species_size_classes_view ON public.species_size_classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = species_size_classes.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = species_size_classes.workspace_id
      AND w.user_id = auth.uid()
    )
  );

-- Repeat for operational settings
DROP POLICY IF EXISTS species_operational_settings_view ON public.species_operational_settings;
CREATE POLICY species_operational_settings_view ON public.species_operational_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = species_operational_settings.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = species_operational_settings.workspace_id
      AND w.user_id = auth.uid()
    )
  );
