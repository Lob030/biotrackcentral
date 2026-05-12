
DROP TABLE IF EXISTS public.ai_aliases CASCADE;
DROP TABLE IF EXISTS public.ai_journal_runs CASCADE;
DROP TABLE IF EXISTS public.ai_telemetry_events CASCADE;

CREATE TABLE public.ai_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','executed','failed','rejected','partial')),
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_action_logs_user_created ON public.ai_action_logs (user_id, created_at DESC);
CREATE INDEX idx_ai_action_logs_workspace ON public.ai_action_logs (workspace_id, created_at DESC);

ALTER TABLE public.ai_action_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users select own ai_action_logs"
  ON public.ai_action_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own ai_action_logs"
  ON public.ai_action_logs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.user_id = auth.uid())
  );

CREATE POLICY "Users update own ai_action_logs"
  ON public.ai_action_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_ai_action_logs_updated
  BEFORE UPDATE ON public.ai_action_logs
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
