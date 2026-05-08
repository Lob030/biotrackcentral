
-- Aliases table (idempotent — file already existed but was unapplied)
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

CREATE INDEX IF NOT EXISTS idx_ai_aliases_org ON public.ai_aliases(organization_id);

ALTER TABLE public.ai_aliases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org select ai_aliases" ON public.ai_aliases;
CREATE POLICY "Org select ai_aliases" ON public.ai_aliases FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
DROP POLICY IF EXISTS "Org insert ai_aliases" ON public.ai_aliases;
CREATE POLICY "Org insert ai_aliases" ON public.ai_aliases FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));
DROP POLICY IF EXISTS "Org update ai_aliases" ON public.ai_aliases;
CREATE POLICY "Org update ai_aliases" ON public.ai_aliases FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));
DROP POLICY IF EXISTS "Org delete ai_aliases" ON public.ai_aliases;
CREATE POLICY "Org delete ai_aliases" ON public.ai_aliases FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

DROP TRIGGER IF EXISTS trg_ai_aliases_updated_at ON public.ai_aliases;
CREATE TRIGGER trg_ai_aliases_updated_at
  BEFORE UPDATE ON public.ai_aliases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Telemetry events
CREATE TABLE IF NOT EXISTS public.ai_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_telemetry_org_created
  ON public.ai_telemetry_events (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_telemetry_event_type
  ON public.ai_telemetry_events (organization_id, event_type);

ALTER TABLE public.ai_telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select ai_telemetry_events" ON public.ai_telemetry_events
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Self insert ai_telemetry_events" ON public.ai_telemetry_events
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org(auth.uid())
    AND user_id = auth.uid()
  );
