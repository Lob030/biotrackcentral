-- Tabla gastos
CREATE TABLE public.gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT NOT NULL,
  subcategoria TEXT,
  descripcion TEXT NOT NULL,
  monto NUMERIC(10,2) NOT NULL DEFAULT 0,
  proveedor TEXT,
  recurrente BOOLEAN NOT NULL DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gastos_org ON public.gastos(organization_id);
CREATE INDEX idx_gastos_fecha ON public.gastos(fecha);
CREATE INDEX idx_gastos_categoria ON public.gastos(categoria);

ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select gastos" ON public.gastos
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org insert gastos" ON public.gastos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org update gastos" ON public.gastos
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org delete gastos" ON public.gastos
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE TRIGGER trg_gastos_updated_at
  BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();