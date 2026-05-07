-- 1) Restrict org admins from assigning super_admin role
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND role IN ('admin'::app_role, 'trabajador'::app_role)
  AND user_id IN (
    SELECT profiles.id FROM public.profiles
    WHERE profiles.organization_id = get_user_org(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND role IN ('admin'::app_role, 'trabajador'::app_role)
  AND user_id IN (
    SELECT profiles.id FROM public.profiles
    WHERE profiles.organization_id = get_user_org(auth.uid())
  )
);

-- 2) Make lote_eventos.created_by immutable after insert
CREATE OR REPLACE FUNCTION public.prevent_lote_eventos_created_by_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'created_by is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lote_eventos_protect_created_by ON public.lote_eventos;
CREATE TRIGGER lote_eventos_protect_created_by
BEFORE UPDATE ON public.lote_eventos
FOR EACH ROW
EXECUTE FUNCTION public.prevent_lote_eventos_created_by_change();