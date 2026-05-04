-- 1. Tighten lote_eventos INSERT: created_by must be auth.uid() or null
DROP POLICY IF EXISTS "Org insert lote_eventos" ON public.lote_eventos;
CREATE POLICY "Org insert lote_eventos"
ON public.lote_eventos
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_user_org(auth.uid())
  AND (created_by IS NULL OR created_by = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_eventos.lote_id
      AND l.organization_id = get_user_org(auth.uid())
  )
);

-- 2. Harden aplicar_evento_lote trigger: re-validate lote belongs to same org
CREATE OR REPLACE FUNCTION public.aplicar_evento_lote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lote_org uuid;
  destino_org uuid;
BEGIN
  -- Re-validate that the referenced lote belongs to the same org as the event
  SELECT organization_id INTO lote_org FROM public.lotes WHERE id = NEW.lote_id;
  IF lote_org IS NULL OR lote_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'Lote does not belong to the same organization as the event';
  END IF;

  -- For traslado_caja, also validate that the destination caja belongs to the same org
  IF NEW.tipo = 'traslado_caja' AND NEW.caja_destino_id IS NOT NULL THEN
    SELECT organization_id INTO destino_org FROM public.cajas WHERE id = NEW.caja_destino_id;
    IF destino_org IS NULL OR destino_org <> NEW.organization_id THEN
      RAISE EXCEPTION 'Destination caja does not belong to the same organization';
    END IF;
  END IF;

  IF NEW.tipo = 'mortalidad' OR NEW.tipo = 'venta' THEN
    UPDATE public.lotes
      SET cantidad_actual = GREATEST(0, COALESCE(cantidad_actual,0) - COALESCE(NEW.cantidad,0)),
          updated_at = now()
      WHERE id = NEW.lote_id
        AND organization_id = NEW.organization_id;
  ELSIF NEW.tipo = 'ajuste' THEN
    UPDATE public.lotes
      SET cantidad_actual = GREATEST(0, COALESCE(cantidad_actual,0) + COALESCE(NEW.cantidad,0)),
          updated_at = now()
      WHERE id = NEW.lote_id
        AND organization_id = NEW.organization_id;
  ELSIF NEW.tipo = 'traslado_caja' AND NEW.caja_destino_id IS NOT NULL THEN
    UPDATE public.lotes
      SET caja_id = NEW.caja_destino_id,
          fecha_introduccion_caja = NEW.fecha,
          updated_at = now()
      WHERE id = NEW.lote_id
        AND organization_id = NEW.organization_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Revoke EXECUTE from public/anon/authenticated on internal SECURITY DEFINER functions.
-- These are used internally by triggers or the auth signup flow, never called by clients.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aplicar_evento_lote() FROM PUBLIC, anon, authenticated;

-- has_role and get_user_org are used inside RLS policies; RLS evaluates them
-- regardless of EXECUTE grants, but they may be invoked from the JS client too.
-- Restrict to authenticated only (revoke from anon).
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_user_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_org(uuid) TO authenticated;