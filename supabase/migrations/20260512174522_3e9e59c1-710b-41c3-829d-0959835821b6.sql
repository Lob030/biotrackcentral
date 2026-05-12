-- Create workspaces table
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('pet', 'business', 'vet')),
  subtype TEXT CHECK (subtype IN ('production', 'pimvs', 'uma', 'trading', 'vet_clinic')),
  animal_class TEXT CHECK (animal_class IN ('mammal', 'fish', 'reptile', 'amphibian', 'bird', 'arthropod', 'annelid')),
  species TEXT,
  name TEXT NOT NULL DEFAULT 'Entorno sin nombre',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON public.workspaces(user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_purpose ON public.workspaces(purpose);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users select own workspaces" ON public.workspaces;
CREATE POLICY "Users select own workspaces" ON public.workspaces
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own workspaces" ON public.workspaces;
CREATE POLICY "Users insert own workspaces" ON public.workspaces
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own workspaces" ON public.workspaces;
CREATE POLICY "Users update own workspaces" ON public.workspaces
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own workspaces" ON public.workspaces;
CREATE POLICY "Users delete own workspaces" ON public.workspaces
  FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP TRIGGER IF EXISTS workspaces_touch_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_touch_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();