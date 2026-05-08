CREATE TABLE IF NOT EXISTS public.ai_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_alias_org UNIQUE (organization_id, alias)
);

CREATE INDEX idx_ai_aliases_org ON public.ai_aliases(organization_id);

ALTER TABLE public.ai_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select ai_aliases" ON public.ai_aliases FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org insert ai_aliases" ON public.ai_aliases FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org update ai_aliases" ON public.ai_aliases FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
CREATE POLICY "Org delete ai_aliases" ON public.ai_aliases FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE TRIGGER trg_ai_aliases_updated_at
  BEFORE UPDATE ON public.ai_aliases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
