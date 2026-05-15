
-- ============================================================================
-- M0: Wipe legacy data (pre-production, no preservation)
-- ============================================================================
TRUNCATE TABLE public.lote_eventos CASCADE;
TRUNCATE TABLE public.lotes CASCADE;
TRUNCATE TABLE public.lineas_geneticas CASCADE;

-- ============================================================================
-- M1: Bridge workspaces -> organizations
-- ============================================================================
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

UPDATE public.workspaces w
   SET organization_id = p.organization_id
  FROM public.profiles p
 WHERE p.id = w.user_id
   AND w.organization_id IS NULL;

-- Drop orphan workspaces (no profile/org)
DELETE FROM public.workspaces WHERE organization_id IS NULL;

ALTER TABLE public.workspaces
  ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_org ON public.workspaces(organization_id);

-- ============================================================================
-- M2: Drop legacy species columns and the enum type
-- ============================================================================
ALTER TABLE public.lotes DROP COLUMN IF EXISTS especie;
ALTER TABLE public.lineas_geneticas DROP COLUMN IF EXISTS especie;
DROP TYPE IF EXISTS public.especie_type;

-- ============================================================================
-- M3: Workspace species profile tables
-- ============================================================================
CREATE TABLE public.workspace_species_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code text NOT NULL,
  display_name text NOT NULL,
  scientific_name text,
  taxonomy_class text,
  capability_profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, code)
);

CREATE INDEX idx_wsp_workspace ON public.workspace_species_profiles(workspace_id);

CREATE TABLE public.species_size_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_profile_id uuid NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  display_name text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  min_weight_g numeric,
  max_weight_g numeric,
  min_age_days integer,
  max_age_days integer,
  is_sale_eligible boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_profile_id, code)
);
CREATE INDEX idx_size_classes_profile ON public.species_size_classes(species_profile_id);

CREATE TABLE public.species_operational_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_profile_id uuid NOT NULL UNIQUE REFERENCES public.workspace_species_profiles(id) ON DELETE CASCADE,
  quantity_unit text NOT NULL DEFAULT 'individuals',
  lot_tracking_mode text NOT NULL DEFAULT 'individual',
  track_mortality boolean NOT NULL DEFAULT true,
  track_breeding boolean NOT NULL DEFAULT true,
  default_breeding_cycle_days integer,
  weaning_age_days integer,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.growth_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_profile_id uuid NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  display_name text NOT NULL,
  rule_type text NOT NULL DEFAULT 'age_days',
  min_value numeric,
  max_value numeric,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_profile_id, code)
);
CREATE INDEX idx_growth_class_profile ON public.growth_classifications(species_profile_id);

CREATE TABLE public.species_pricing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  species_profile_id uuid NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE CASCADE,
  size_class_id uuid REFERENCES public.species_size_classes(id) ON DELETE CASCADE,
  base_price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'MXN',
  pricing_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pricing_profile ON public.species_pricing_profiles(species_profile_id);

-- updated_at triggers
CREATE TRIGGER trg_wsp_updated BEFORE UPDATE ON public.workspace_species_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_size_classes_updated BEFORE UPDATE ON public.species_size_classes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_op_settings_updated BEFORE UPDATE ON public.species_operational_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_growth_class_updated BEFORE UPDATE ON public.growth_classifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_pricing_updated BEFORE UPDATE ON public.species_pricing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.workspace_species_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_size_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_operational_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species_pricing_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function: does this user own this workspace?
CREATE OR REPLACE FUNCTION public.user_owns_workspace(_workspace_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspaces
    WHERE id = _workspace_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.user_owns_species_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.workspace_species_profiles p
      JOIN public.workspaces w ON w.id = p.workspace_id
     WHERE p.id = _profile_id AND w.user_id = auth.uid()
  )
$$;

-- workspace_species_profiles policies
CREATE POLICY "Owner select wsp" ON public.workspace_species_profiles FOR SELECT TO authenticated
  USING (public.user_owns_workspace(workspace_id));
CREATE POLICY "Owner insert wsp" ON public.workspace_species_profiles FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_workspace(workspace_id));
CREATE POLICY "Owner update wsp" ON public.workspace_species_profiles FOR UPDATE TO authenticated
  USING (public.user_owns_workspace(workspace_id));
CREATE POLICY "Owner delete wsp" ON public.workspace_species_profiles FOR DELETE TO authenticated
  USING (public.user_owns_workspace(workspace_id));

-- Child table policies (use species profile ownership)
CREATE POLICY "Owner all size_classes" ON public.species_size_classes FOR ALL TO authenticated
  USING (public.user_owns_species_profile(species_profile_id))
  WITH CHECK (public.user_owns_species_profile(species_profile_id));

CREATE POLICY "Owner all op_settings" ON public.species_operational_settings FOR ALL TO authenticated
  USING (public.user_owns_species_profile(species_profile_id))
  WITH CHECK (public.user_owns_species_profile(species_profile_id));

CREATE POLICY "Owner all growth_class" ON public.growth_classifications FOR ALL TO authenticated
  USING (public.user_owns_species_profile(species_profile_id))
  WITH CHECK (public.user_owns_species_profile(species_profile_id));

CREATE POLICY "Owner all pricing" ON public.species_pricing_profiles FOR ALL TO authenticated
  USING (public.user_owns_species_profile(species_profile_id))
  WITH CHECK (public.user_owns_species_profile(species_profile_id));

-- ============================================================================
-- M4: Add species_profile_id FK to lotes and lineas_geneticas (NOT NULL,
-- since data was wiped)
-- ============================================================================
ALTER TABLE public.lotes
  ADD COLUMN species_profile_id uuid NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE RESTRICT;
CREATE INDEX idx_lotes_species_profile ON public.lotes(species_profile_id);

ALTER TABLE public.lineas_geneticas
  ADD COLUMN species_profile_id uuid NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE RESTRICT;
CREATE INDEX idx_lineas_species_profile ON public.lineas_geneticas(species_profile_id);

-- ============================================================================
-- M5: Cross-org integrity trigger
-- Ensures the species profile's workspace belongs to the same organization
-- as the lot or lineage record.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_species_profile_org()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_org uuid;
BEGIN
  SELECT w.organization_id INTO profile_org
    FROM public.workspace_species_profiles p
    JOIN public.workspaces w ON w.id = p.workspace_id
   WHERE p.id = NEW.species_profile_id;

  IF profile_org IS NULL THEN
    RAISE EXCEPTION 'species_profile_id % does not exist', NEW.species_profile_id;
  END IF;

  IF profile_org <> NEW.organization_id THEN
    RAISE EXCEPTION 'species profile workspace organization (%) does not match record organization (%)', profile_org, NEW.organization_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_lotes_validate_species
  BEFORE INSERT OR UPDATE OF species_profile_id, organization_id ON public.lotes
  FOR EACH ROW EXECUTE FUNCTION public.validate_species_profile_org();

CREATE TRIGGER trg_lineas_validate_species
  BEFORE INSERT OR UPDATE OF species_profile_id, organization_id ON public.lineas_geneticas
  FOR EACH ROW EXECUTE FUNCTION public.validate_species_profile_org();
