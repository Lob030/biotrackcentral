-- 1) Scope user_roles admin policy to same organization
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;

CREATE POLICY "Admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE organization_id = public.get_user_org(auth.uid())
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id IN (
    SELECT id FROM public.profiles
    WHERE organization_id = public.get_user_org(auth.uid())
  )
);

-- 2) Tighten lote_eventos INSERT to require lote_id belongs to caller's org
DROP POLICY IF EXISTS "Org insert lote_eventos" ON public.lote_eventos;

CREATE POLICY "Org insert lote_eventos"
ON public.lote_eventos
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_id
      AND l.organization_id = public.get_user_org(auth.uid())
  )
);

-- Also tighten UPDATE/DELETE for symmetry
DROP POLICY IF EXISTS "Org update lote_eventos" ON public.lote_eventos;
CREATE POLICY "Org update lote_eventos"
ON public.lote_eventos
FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_id
      AND l.organization_id = public.get_user_org(auth.uid())
  )
);

DROP POLICY IF EXISTS "Org delete lote_eventos" ON public.lote_eventos;
CREATE POLICY "Org delete lote_eventos"
ON public.lote_eventos
FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_org(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.lotes l
    WHERE l.id = lote_id
      AND l.organization_id = public.get_user_org(auth.uid())
  )
);