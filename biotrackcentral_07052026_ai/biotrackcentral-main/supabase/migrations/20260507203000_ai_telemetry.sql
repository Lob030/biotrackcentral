CREATE TABLE IF NOT EXISTS public.ai_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  event_type TEXT NOT NULL,
  duration_ms INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_telemetry_org_date ON public.ai_telemetry_events (organization_id, created_at DESC);
CREATE INDEX idx_ai_telemetry_type ON public.ai_telemetry_events (organization_id, event_type);

ALTER TABLE public.ai_telemetry_events ENABLE ROW LEVEL SECURITY;

-- Admins can view telemetry for their org
CREATE POLICY "Admin select ai_telemetry" ON public.ai_telemetry_events 
  FOR SELECT TO authenticated 
  USING (
    organization_id = public.get_user_org(auth.uid()) 
    AND public.has_role(auth.uid(), 'admin')
  );

-- Users can insert telemetry for their org
CREATE POLICY "Org insert ai_telemetry" ON public.ai_telemetry_events 
  FOR INSERT TO authenticated 
  WITH CHECK (
    organization_id = public.get_user_org(auth.uid()) 
    AND user_id = auth.uid()
  );
