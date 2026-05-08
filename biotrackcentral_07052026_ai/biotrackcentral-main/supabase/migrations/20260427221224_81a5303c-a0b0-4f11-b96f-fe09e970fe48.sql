-- Enum para tipos de evento
CREATE TYPE public.lote_evento_tipo AS ENUM (
  'mortalidad',
  'venta',
  'traslado_caja',
  'ajuste',
  'separacion_sexo',
  'nota'
);

-- Tabla de eventos
CREATE TABLE public.lote_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  lote_id UUID NOT NULL,
  tipo public.lote_evento_tipo NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  cantidad INTEGER NOT NULL DEFAULT 0,
  caja_destino_id UUID,
  precio_unitario NUMERIC(12,2),
  notas TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lote_eventos_lote ON public.lote_eventos(lote_id);
CREATE INDEX idx_lote_eventos_org ON public.lote_eventos(organization_id);
CREATE INDEX idx_lote_eventos_fecha ON public.lote_eventos(fecha DESC);

ALTER TABLE public.lote_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org select lote_eventos" ON public.lote_eventos
  FOR SELECT TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org insert lote_eventos" ON public.lote_eventos
  FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org update lote_eventos" ON public.lote_eventos
  FOR UPDATE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Org delete lote_eventos" ON public.lote_eventos
  FOR DELETE TO authenticated
  USING (organization_id = public.get_user_org(auth.uid()));

-- Trigger: aplicar el efecto del evento sobre el lote
CREATE OR REPLACE FUNCTION public.aplicar_evento_lote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'mortalidad' OR NEW.tipo = 'venta' THEN
    UPDATE public.lotes
      SET cantidad_actual = GREATEST(0, COALESCE(cantidad_actual,0) - COALESCE(NEW.cantidad,0)),
          updated_at = now()
      WHERE id = NEW.lote_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.lotes
      SET cantidad_actual = GREATEST(0, COALESCE(cantidad_actual,0) + COALESCE(NEW.cantidad,0)),
          updated_at = now()
      WHERE id = NEW.lote_id;
  ELSIF NEW.tipo = 'traslado_caja' AND NEW.caja_destino_id IS NOT NULL THEN
    UPDATE public.lotes
      SET caja_id = NEW.caja_destino_id,
          fecha_introduccion_caja = NEW.fecha,
          updated_at = now()
      WHERE id = NEW.lote_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aplicar_evento_lote
  AFTER INSERT ON public.lote_eventos
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_evento_lote();