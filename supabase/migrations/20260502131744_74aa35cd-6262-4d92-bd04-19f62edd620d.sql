-- Campos de plan en organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_expira_en DATE,
  ADD COLUMN IF NOT EXISTS plan_gratis_trial BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nombre_bioterio TEXT;

DO $$ BEGIN
  ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_plan_check
    CHECK (plan IN ('free','basico','profesional','enterprise'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabla historial
CREATE TABLE IF NOT EXISTS public.plan_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_anterior TEXT,
  plan_nuevo TEXT NOT NULL,
  motivo TEXT,
  cambiado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_historial ENABLE ROW LEVEL SECURITY;

-- Policies super_admin
DROP POLICY IF EXISTS "Super admin select organizations" ON public.organizations;
CREATE POLICY "Super admin select organizations"
ON public.organizations FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin update organizations" ON public.organizations;
CREATE POLICY "Super admin update organizations"
ON public.organizations FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin select profiles" ON public.profiles;
CREATE POLICY "Super admin select profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin select user_roles" ON public.user_roles;
CREATE POLICY "Super admin select user_roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin manage user_roles" ON public.user_roles;
CREATE POLICY "Super admin manage user_roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin select plan_historial" ON public.plan_historial;
CREATE POLICY "Super admin select plan_historial"
ON public.plan_historial FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin insert plan_historial" ON public.plan_historial;
CREATE POLICY "Super admin insert plan_historial"
ON public.plan_historial FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Org select plan_historial" ON public.plan_historial;
CREATE POLICY "Org select plan_historial"
ON public.plan_historial FOR SELECT TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_plan_historial_org ON public.plan_historial(organization_id);