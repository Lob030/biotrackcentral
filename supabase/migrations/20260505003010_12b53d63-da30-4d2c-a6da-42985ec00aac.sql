-- Tabla para configuración de alertas del sistema (toggle activa/inactiva por org)
CREATE TABLE IF NOT EXISTS public.alertas_sistema_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  alerta_key TEXT NOT NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, alerta_key)
);

ALTER TABLE public.alertas_sistema_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select alertas_sistema_config" ON public.alertas_sistema_config
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org insert alertas_sistema_config" ON public.alertas_sistema_config
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org update alertas_sistema_config" ON public.alertas_sistema_config
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org delete alertas_sistema_config" ON public.alertas_sistema_config
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE TRIGGER alertas_sistema_config_touch
  BEFORE UPDATE ON public.alertas_sistema_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_alertas_sistema_config_org ON public.alertas_sistema_config(organization_id);

-- Tabla para alertas personalizadas
CREATE TABLE IF NOT EXISTS public.alertas_personalizadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  nombre TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📌',
  mensaje TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('recordatorio','condicion','fecha')),
  activa BOOLEAN NOT NULL DEFAULT true,

  -- recordatorio
  se_repite BOOLEAN NOT NULL DEFAULT false,
  cada_x_dias INTEGER,
  ultima_generacion DATE,

  -- condición
  condicion_tipo TEXT,
  condicion_referencia TEXT,
  condicion_operador TEXT,
  condicion_valor_1 NUMERIC(12,2),
  condicion_valor_2 NUMERIC(12,2),

  -- fecha
  fecha_tipo TEXT,
  fecha_dia_mes INTEGER,
  fecha_unica DATE,

  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alertas_personalizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select alertas_personalizadas" ON public.alertas_personalizadas
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org insert alertas_personalizadas" ON public.alertas_personalizadas
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_user_org(auth.uid())
    AND (created_by IS NULL OR created_by = auth.uid())
  );

CREATE POLICY "Org update alertas_personalizadas" ON public.alertas_personalizadas
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org delete alertas_personalizadas" ON public.alertas_personalizadas
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE TRIGGER alertas_personalizadas_touch
  BEFORE UPDATE ON public.alertas_personalizadas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_alertas_personalizadas_org ON public.alertas_personalizadas(organization_id);
CREATE INDEX idx_alertas_personalizadas_activa ON public.alertas_personalizadas(organization_id, activa);