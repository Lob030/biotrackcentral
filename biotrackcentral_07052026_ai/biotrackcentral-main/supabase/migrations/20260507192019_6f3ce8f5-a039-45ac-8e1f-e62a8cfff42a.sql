
-- 1) alertas_personalizadas.created_by immutable
CREATE OR REPLACE FUNCTION public.prevent_alertas_pers_created_by_change()
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

REVOKE ALL ON FUNCTION public.prevent_alertas_pers_created_by_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS alertas_pers_protect_created_by ON public.alertas_personalizadas;
CREATE TRIGGER alertas_pers_protect_created_by
BEFORE UPDATE ON public.alertas_personalizadas
FOR EACH ROW EXECUTE FUNCTION public.prevent_alertas_pers_created_by_change();

-- 2) Prevent removing the last admin of an org (DELETE or UPDATE away from admin)
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  org_id uuid;
  remaining_admins int;
  affected_user uuid;
  affected_role app_role;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_user := OLD.user_id;
    affected_role := OLD.role;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only relevant if previously admin and now changing
    IF OLD.role <> 'admin' OR NEW.role = 'admin' THEN
      RETURN NEW;
    END IF;
    affected_user := OLD.user_id;
    affected_role := OLD.role;
  END IF;

  IF affected_role <> 'admin' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT organization_id INTO org_id FROM public.profiles WHERE id = affected_user;
  IF org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*) INTO remaining_admins
  FROM public.user_roles ur
  JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'
    AND p.organization_id = org_id
    AND ur.user_id <> affected_user;

  IF remaining_admins = 0 THEN
    RAISE EXCEPTION 'Cannot remove the last admin of the organization';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_last_admin_removal() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS user_roles_prevent_last_admin ON public.user_roles;
CREATE TRIGGER user_roles_prevent_last_admin
BEFORE DELETE OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- 3) profiles INSERT policy (only self + own org)
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid() AND organization_id = get_user_org(auth.uid()));

-- 4) Revoke public execute on internal SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_lote_eventos_created_by_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aplicar_evento_lote() FROM PUBLIC, anon, authenticated;
-- has_role and get_user_org are used inside RLS policies; keep authenticated execute
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
REVOKE ALL ON FUNCTION public.get_user_org(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_org(uuid) TO authenticated;
