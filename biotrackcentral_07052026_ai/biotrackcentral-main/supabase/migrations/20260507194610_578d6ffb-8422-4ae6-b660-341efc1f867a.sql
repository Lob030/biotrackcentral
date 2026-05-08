CREATE TABLE public.ai_journal_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  note text NOT NULL,
  operations jsonb NOT NULL DEFAULT '[]'::jsonb,
  invalid jsonb NOT NULL DEFAULT '[]'::jsonb,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_journal_runs_org_created ON public.ai_journal_runs (organization_id, created_at DESC);

ALTER TABLE public.ai_journal_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select ai_journal_runs"
  ON public.ai_journal_runs FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org insert ai_journal_runs"
  ON public.ai_journal_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org(auth.uid())
    AND user_id = auth.uid()
  );