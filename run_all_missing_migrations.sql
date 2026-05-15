-- Workspace Species Profiles System
-- Migration: Create species profile tables for workspace-scoped operational configuration
-- 
-- CRITICAL PRINCIPLES:
-- - Species are NOT hardcoded operational behavior
-- - Each workspace can customize classifications, sizes, weights, ages, pricing
-- - Built-in species (ASF, Rat, Mouse) are starter blueprints, not immutable definitions
-- - Species Profiles are WORKSPACE-SCOPED
-- - Operational entities reference sizeClassId, NOT size names as strings

-- ============================================================================
-- WORKSPACE SPECIES PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS workspace_species_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Species reference
  species_id TEXT NOT NULL,           -- Biological species identifier (e.g., 'mastomys_natalensis')
  species_name TEXT NOT NULL,         -- Display name (e.g., 'ASF', 'Mouse', 'Rat')
  scientific_name TEXT,               -- Scientific name (e.g., 'Mus musculus')
  
  -- Operational configuration
  operational_name TEXT NOT NULL,     -- How this workspace refers to this species
  description TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_custom BOOLEAN NOT NULL DEFAULT false,          -- true if workspace-defined
  is_starter_blueprint BOOLEAN NOT NULL DEFAULT false, -- true if from built-in blueprint
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index for workspace queries
CREATE INDEX IF NOT EXISTS idx_workspace_species_profiles_workspace_id 
  ON workspace_species_profiles(workspace_id);

-- Index for species lookups
CREATE INDEX IF NOT EXISTS idx_workspace_species_profiles_species_id 
  ON workspace_species_profiles(species_id);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_workspace_species_profiles_workspace_active 
  ON workspace_species_profiles(workspace_id, is_active);

-- ============================================================================
-- SPECIES SIZE CLASSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS species_size_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  species_profile_id UUID NOT NULL REFERENCES workspace_species_profiles(id) ON DELETE CASCADE,
  
  -- Classification
  name TEXT NOT NULL,                 -- Operational name (e.g., 'Pinky', '20g', 'Adult')
  code TEXT,                          -- Short code for internal use (e.g., 'PK', '20G', 'AD')
  
  -- Weight range (grams)
  min_weight_grams NUMERIC(8,2),
  max_weight_grams NUMERIC(8,2),
  
  -- Age range (days)
  min_age_days INTEGER,
  max_age_days INTEGER,
  
  -- Pricing
  sale_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  
  -- Ordering
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- Status flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,   -- Default size class for this species
  is_custom BOOLEAN NOT NULL DEFAULT false,    -- true if workspace-defined
  
  -- Metadata
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for species profile queries
CREATE INDEX IF NOT EXISTS idx_species_size_classes_species_profile_id 
  ON species_size_classes(species_profile_id);

-- Index for workspace queries
CREATE INDEX IF NOT EXISTS idx_species_size_classes_workspace_id 
  ON species_size_classes(workspace_id);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_species_size_classes_display_order 
  ON species_size_classes(species_profile_id, display_order);

-- Index for default class lookup
CREATE INDEX IF NOT EXISTS idx_species_size_classes_default 
  ON species_size_classes(species_profile_id, is_default) WHERE is_default = true;

-- ============================================================================
-- SPECIES OPERATIONAL SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS species_operational_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  species_profile_id UUID NOT NULL UNIQUE REFERENCES workspace_species_profiles(id) ON DELETE CASCADE,
  
  -- Breeding parameters
  breeding_cycle_days INTEGER NOT NULL DEFAULT 4,
  expected_weaning_age_days INTEGER NOT NULL DEFAULT 21,
  expected_gestation_days INTEGER NOT NULL DEFAULT 23,
  maturity_age_days INTEGER NOT NULL DEFAULT 42,
  
  -- Growth parameters
  expected_birth_weight_grams NUMERIC(8,2) NOT NULL DEFAULT 3.0,
  expected_adult_weight_grams NUMERIC(8,2) NOT NULL DEFAULT 60.0,
  
  -- Mortality expectations
  expected_mortality_rate NUMERIC(4,3) NOT NULL DEFAULT 0.05,  -- 0-1 range
  
  -- Growth curve reference
  expected_growth_curve TEXT,
  
  -- Operational defaults
  default_sex_ratio NUMERIC(4,2),      -- Expected M:F ratio
  typical_litter_size INTEGER,         -- Average litter size
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for species profile lookup
CREATE INDEX IF NOT EXISTS idx_species_operational_settings_species_profile_id 
  ON species_operational_settings(species_profile_id);

-- ============================================================================
-- GROWTH CLASSIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS growth_classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  species_profile_id UUID NOT NULL REFERENCES workspace_species_profiles(id) ON DELETE CASCADE,
  size_class_id UUID NOT NULL REFERENCES species_size_classes(id) ON DELETE CASCADE,
  
  -- Classification criteria
  weight_range_min NUMERIC(8,2),
  weight_range_max NUMERIC(8,2),
  age_range_min INTEGER,
  age_range_max INTEGER,
  
  -- Priority (for overlapping ranges)
  priority INTEGER NOT NULL DEFAULT 0,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_growth_classifications_species_profile_id 
  ON growth_classifications(species_profile_id);

CREATE INDEX IF NOT EXISTS idx_growth_classifications_size_class_id 
  ON growth_classifications(size_class_id);

-- ============================================================================
-- SPECIES PRICING PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS species_pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  species_profile_id UUID NOT NULL REFERENCES workspace_species_profiles(id) ON DELETE CASCADE,
  
  -- Pricing configuration
  base_price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Temporal pricing
  effective_from TIMESTAMPTZ,
  effective_to TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_species_pricing_profiles_species_profile_id 
  ON species_pricing_profiles(species_profile_id);

-- ============================================================================
-- SIZE CLASS PRICING OVERRIDES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS size_class_pricing_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_profile_id UUID NOT NULL REFERENCES species_pricing_profiles(id) ON DELETE CASCADE,
  size_class_id UUID NOT NULL REFERENCES species_size_classes(id) ON DELETE CASCADE,
  
  -- Pricing
  price NUMERIC(10,2) NOT NULL,
  cost_basis NUMERIC(10,2),
  margin_percent NUMERIC(5,2),
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_size_class_pricing_overrides_pricing_profile_id 
  ON size_class_pricing_overrides(pricing_profile_id);

-- ============================================================================
-- VOLUME DISCOUNTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS volume_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pricing_profile_id UUID NOT NULL REFERENCES species_pricing_profiles(id) ON DELETE CASCADE,
  
  -- Discount configuration
  min_quantity INTEGER NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_volume_discounts_pricing_profile_id 
  ON volume_discounts(pricing_profile_id);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to workspace_species_profiles
DROP TRIGGER IF EXISTS update_workspace_species_profiles_updated_at ON workspace_species_profiles;
CREATE TRIGGER update_workspace_species_profiles_updated_at
  BEFORE UPDATE ON workspace_species_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to species_size_classes
DROP TRIGGER IF EXISTS update_species_size_classes_updated_at ON species_size_classes;
CREATE TRIGGER update_species_size_classes_updated_at
  BEFORE UPDATE ON species_size_classes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to species_operational_settings
DROP TRIGGER IF EXISTS update_species_operational_settings_updated_at ON species_operational_settings;
CREATE TRIGGER update_species_operational_settings_updated_at
  BEFORE UPDATE ON species_operational_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to growth_classifications
DROP TRIGGER IF EXISTS update_growth_classifications_updated_at ON growth_classifications;
CREATE TRIGGER update_growth_classifications_updated_at
  BEFORE UPDATE ON growth_classifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to species_pricing_profiles
DROP TRIGGER IF EXISTS update_species_pricing_profiles_updated_at ON species_pricing_profiles;
CREATE TRIGGER update_species_pricing_profiles_updated_at
  BEFORE UPDATE ON species_pricing_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE workspace_species_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_size_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_operational_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE species_pricing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE size_class_pricing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE volume_discounts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view data in their workspace
CREATE POLICY workspace_species_profiles_view ON workspace_species_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY workspace_species_profiles_insert ON workspace_species_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY workspace_species_profiles_update ON workspace_species_profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY workspace_species_profiles_delete ON workspace_species_profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Similar policies for species_size_classes
CREATE POLICY species_size_classes_view ON species_size_classes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = species_size_classes.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY species_size_classes_mod ON species_size_classes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = species_size_classes.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Similar policies for species_operational_settings
CREATE POLICY species_operational_settings_view ON species_operational_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = species_operational_settings.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY species_operational_settings_mod ON species_operational_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = species_operational_settings.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Similar policies for growth_classifications
CREATE POLICY growth_classifications_view ON growth_classifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = growth_classifications.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY growth_classifications_mod ON growth_classifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = growth_classifications.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Similar policies for species_pricing_profiles
CREATE POLICY species_pricing_profiles_view ON species_pricing_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = species_pricing_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY species_pricing_profiles_mod ON species_pricing_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = species_pricing_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Similar policies for size_class_pricing_overrides
CREATE POLICY size_class_pricing_overrides_view ON size_class_pricing_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = (
        SELECT workspace_id FROM species_pricing_profiles
        WHERE id = size_class_pricing_overrides.pricing_profile_id
      )
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY size_class_pricing_overrides_mod ON size_class_pricing_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = (
        SELECT workspace_id FROM species_pricing_profiles
        WHERE id = size_class_pricing_overrides.pricing_profile_id
      )
      AND wm.user_id = auth.uid()
    )
  );

-- Similar policies for volume_discounts
CREATE POLICY volume_discounts_view ON volume_discounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = (
        SELECT workspace_id FROM species_pricing_profiles
        WHERE id = volume_discounts.pricing_profile_id
      )
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY volume_discounts_mod ON volume_discounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = (
        SELECT workspace_id FROM species_pricing_profiles
        WHERE id = volume_discounts.pricing_profile_id
      )
      AND wm.user_id = auth.uid()
    )
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE workspace_species_profiles IS 'Workspace-scoped species operational profiles. Each workspace defines how they manage species.';
COMMENT ON TABLE species_size_classes IS 'Operational size classifications for species within a workspace (e.g., Pinky/Fuzzy/Hopper or 10g/20g/Adult).';
COMMENT ON TABLE species_operational_settings IS 'Operational parameters for managing a species (breeding cycles, weaning age, etc.).';
COMMENT ON TABLE growth_classifications IS 'Maps weight/age measurements to size classes for runtime classification.';
COMMENT ON TABLE species_pricing_profiles IS 'Pricing rules and tiers for species in a workspace.';
COMMENT ON TABLE size_class_pricing_overrides IS 'Size-class-specific pricing overrides.';
COMMENT ON TABLE volume_discounts IS 'Volume-based discounts for species pricing.';
-- Fix Workspace Membership and RLS Visibility
-- 
-- This migration ensures that every workspace creator is automatically added
-- as a member of the workspace, enabling RLS policies to function correctly.

-- 1. Create workspace_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON public.workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);

-- Enable RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Workspace members policies
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
CREATE POLICY "Users can view their own memberships"
  ON public.workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. Trigger to auto-add creator to workspace_members
CREATE OR REPLACE FUNCTION public.handle_new_workspace_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.user_id, 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace_member();

-- 3. Backfill existing workspaces
INSERT INTO public.workspace_members (workspace_id, user_id, role)
SELECT id, user_id, 'admin' FROM public.workspaces
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- 4. Update RLS policies for Species Profiles to be more resilient
-- We add a fallback to check workspaces.user_id directly

DROP POLICY IF EXISTS workspace_species_profiles_view ON public.workspace_species_profiles;
CREATE POLICY workspace_species_profiles_view ON public.workspace_species_profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_species_profiles.workspace_id
      AND w.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS workspace_species_profiles_insert ON public.workspace_species_profiles;
CREATE POLICY workspace_species_profiles_insert ON public.workspace_species_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = workspace_species_profiles.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_species_profiles.workspace_id
      AND w.user_id = auth.uid()
    )
  );

-- Repeat for size classes
DROP POLICY IF EXISTS species_size_classes_view ON public.species_size_classes;
CREATE POLICY species_size_classes_view ON public.species_size_classes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = species_size_classes.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = species_size_classes.workspace_id
      AND w.user_id = auth.uid()
    )
  );

-- Repeat for operational settings
DROP POLICY IF EXISTS species_operational_settings_view ON public.species_operational_settings;
CREATE POLICY species_operational_settings_view ON public.species_operational_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = species_operational_settings.workspace_id
      AND wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = species_operational_settings.workspace_id
      AND w.user_id = auth.uid()
    )
  );
-- ============================================================================
-- BIOTERIO OPERATIONAL PERSISTENCE LAYER
-- Hybrid Event-Driven Architecture
-- ============================================================================
-- 
-- ARCHITECTURAL PRINCIPLES:
-- 1. Operational Events are the immutable historical source of truth
-- 2. Materialized projections provide fast runtime access
-- 3. Current state does NOT require replaying full event stream
-- 4. Historical traceability is always preserved
-- 5. INSERT ONLY for events - no destructive updates or deletions
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS FOR OPERATIONAL TYPES
-- ============================================================================

-- Lot lifecycle status
CREATE TYPE public.lot_status AS ENUM (
  'active',       -- Currently operational
  'subdivided',   -- Has been split into child lots
  'sold',         -- Transferred out via sale
  'retired',      -- Retired from breeding/production
  'deceased'      -- All animals deceased
);

-- Lot source type
CREATE TYPE public.lot_source_type AS ENUM (
  'internal_birth',
  'external_purchase',
  'transfer'
);

-- Sex classification
CREATE TYPE public.lot_sex_type AS ENUM (
  'mixed',
  'male',
  'female'
);

-- Cage operational status
CREATE TYPE public.cage_status AS ENUM (
  'available',
  'occupied',
  'cleaning',
  'maintenance',
  'quarantine'
);

-- Movement types
CREATE TYPE public.movement_type AS ENUM (
  'initial_assignment',
  'transfer',
  'relocation',
  'removal'
);

-- Breeding group status
CREATE TYPE public.breeding_group_status AS ENUM (
  'active',
  'paused',
  'completed',
  'dissolved'
);

-- Operational event types (extensible)
CREATE TYPE public.operational_event_type AS ENUM (
  -- Lot events
  'lot_created',
  'lot_subdivided',
  'lot_animals_added',
  'lot_animals_removed',
  'lot_mortality',
  'lot_status_changed',
  'lot_sold',
  'lot_retired',
  
  -- Cage events
  'cage_created',
  'cage_status_changed',
  'cage_lot_assigned',
  'cage_lot_removed',
  'cage_lot_moved_in',
  'cage_lot_moved_out',
  'cage_cleaning_started',
  'cage_cleaning_completed',
  'cage_maintenance_started',
  'cage_maintenance_completed',
  
  -- Breeding events
  'breeding_group_created',
  'breeding_group_litter_born',
  'breeding_group_paused',
  'breeding_group_completed',
  'breeding_group_dissolved',
  'litter_recorded',
  
  -- General operational events
  'inventory_adjustment',
  'environmental_alert',
  'health_incident',
  'protocol_violation',
  'audit_checkpoint'
);

-- ============================================================================
-- CORE OPERATIONAL TABLES
-- ============================================================================

-- Lots table - current materialized state
CREATE TABLE public.lots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Identity
  code VARCHAR(50) NOT NULL,
  
  -- Biological attributes
  species_id VARCHAR(100) NOT NULL,  -- Reference to species entity (flexible)
  strain VARCHAR(200),
  sex lot_sex_type NOT NULL,
  
  -- Population
  initial_quantity INTEGER NOT NULL DEFAULT 0,
  current_quantity INTEGER NOT NULL DEFAULT 0,
  
  -- Dates
  birth_date TIMESTAMPTZ,
  acquisition_date TIMESTAMPTZ,
  
  -- Origin tracking
  source_type lot_source_type NOT NULL,
  origin_lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  supplier_name TEXT,
  
  -- Operational state
  status lot_status NOT NULL DEFAULT 'active',
  location TEXT,
  cage_id UUID,  -- Current cage assignment
  
  -- Lineage (denormalized for quick access)
  generation_depth INTEGER NOT NULL DEFAULT 0,
  ancestor_ids UUID[] DEFAULT '{}',
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Constraints
  CONSTRAINT lots_current_quantity_non_negative CHECK (current_quantity >= 0),
  CONSTRAINT lots_initial_quantity_positive CHECK (initial_quantity > 0)
);

-- Lot events - IMMUTABLE event log (INSERT ONLY)
CREATE TABLE public.lot_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Event reference
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- Allows extensibility beyond enum
  event_category VARCHAR(50) NOT NULL,
  
  -- Event data
  quantity_affected INTEGER,
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Actor/context
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  
  -- Timestamp (UTC) - immutable
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Immutable marker
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE
);

-- Cages table - current materialized state
CREATE TABLE public.cages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Identity
  code VARCHAR(50) NOT NULL,
  
  -- Location hierarchy
  room_id UUID,
  zone_id UUID,
  rack_position VARCHAR(20),
  
  -- Capacity configuration
  max_animals INTEGER NOT NULL,
  max_lots INTEGER DEFAULT 1,
  volume_liters NUMERIC,
  floor_area_cm2 NUMERIC,
  species_compatibility TEXT[] DEFAULT '{}',
  
  -- Environmental monitoring
  temperature_celsius NUMERIC(4,2),
  humidity_percent NUMERIC(5,2),
  light_cycle VARCHAR(20),
  
  -- Operational state
  status cage_status NOT NULL DEFAULT 'available',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Maintenance tracking
  last_cleaned_at TIMESTAMPTZ,
  last_maintenance_at TIMESTAMPTZ,
  cleaning_interval_days INTEGER DEFAULT 14,
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Constraints
  CONSTRAINT cages_max_animals_positive CHECK (max_animals > 0)
);

-- Cage movements - IMMUTABLE movement log (INSERT ONLY)
CREATE TABLE public.cage_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Movement reference
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  from_cage_id UUID REFERENCES public.cages(id) ON DELETE SET NULL,
  to_cage_id UUID REFERENCES public.cages(id) ON DELETE SET NULL,
  movement_type movement_type NOT NULL,
  
  -- Movement details
  quantity_moved INTEGER,
  reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Actor/context
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  
  -- Timestamp (UTC) - immutable
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Immutable marker
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Indexes for temporal queries
  CONSTRAINT cage_movements_has_destination CHECK (to_cage_id IS NOT NULL OR movement_type = 'removal')
);

-- Lot assignments - current active assignments (materialized)
CREATE TABLE public.lot_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Assignment reference
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  cage_id UUID NOT NULL REFERENCES public.cages(id) ON DELETE CASCADE,
  
  -- Assignment details
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  quantity_at_assignment INTEGER NOT NULL,
  notes TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ended_at TIMESTAMPTZ,
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Unique constraint: one active assignment per lot
  CONSTRAINT unique_active_lot_assignment UNIQUE (lot_id, is_active)
);

-- Breeding groups
CREATE TABLE public.breeding_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Identity
  code VARCHAR(50) NOT NULL,
  
  -- Breeding composition
  sire_lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  dam_lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  dam_count INTEGER NOT NULL DEFAULT 1,
  
  -- Breeding parameters
  species_id VARCHAR(100) NOT NULL,
  strain VARCHAR(200),
  breeding_protocol TEXT,
  target_offspring_count INTEGER,
  
  -- Operational state
  status breeding_group_status NOT NULL DEFAULT 'active',
  cage_id UUID REFERENCES public.cages(id) ON DELETE SET NULL,
  
  -- Timeline
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  completed_at TIMESTAMPTZ,
  
  -- Results tracking
  total_litters_born INTEGER NOT NULL DEFAULT 0,
  total_offspring_born INTEGER NOT NULL DEFAULT 0,
  successful_weanings INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC'
);

-- Litters
CREATE TABLE public.litters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Parentage
  breeding_group_id UUID NOT NULL REFERENCES public.breeding_groups(id) ON DELETE CASCADE,
  sire_lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  dam_lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  
  -- Litter data
  born_count INTEGER NOT NULL,
  live_births INTEGER NOT NULL,
  stillbirths INTEGER DEFAULT 0,
  weaned_count INTEGER DEFAULT 0,
  
  -- Birth details
  birth_date TIMESTAMPTZ NOT NULL,
  weaning_date TIMESTAMPTZ,
  offspring_lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  
  -- Health/viability
  viability_notes TEXT,
  anomalies_detected TEXT[],
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Constraints
  CONSTRAINT litters_live_births_valid CHECK (live_births <= born_count AND live_births >= 0),
  CONSTRAINT litters_stillbirths_valid CHECK (stillbirths >= 0),
  CONSTRAINT litters_weaned_valid CHECK (weaned_count >= 0)
);

-- ============================================================================
-- OPERATIONAL EVENTS TABLE (UNIVERSAL EVENT LOG)
-- ============================================================================

-- Operational events - IMMUTABLE universal event log (INSERT ONLY)
CREATE TABLE public.operational_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Event classification
  event_type operational_event_type NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  
  -- Entity references (polymorphic)
  lot_id UUID REFERENCES public.lots(id) ON DELETE SET NULL,
  cage_id UUID REFERENCES public.cages(id) ON DELETE SET NULL,
  breeding_group_id UUID REFERENCES public.breeding_groups(id) ON DELETE SET NULL,
  litter_id UUID REFERENCES public.litters(id) ON DELETE SET NULL,
  
  -- Event payload
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_state JSONB,
  new_state JSONB,
  
  -- Context
  reason TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Actor
  performed_by UUID REFERENCES auth.users(id),
  performed_by_name TEXT,
  
  -- Timestamp (UTC) - immutable
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Immutable marker
  is_immutable BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Hash for integrity verification
  event_hash VARCHAR(64)
);

-- ============================================================================
-- OPERATIONAL SNAPSHOTS (MATERIALIZED PROJECTIONS)
-- ============================================================================

-- Operational snapshots - point-in-time materialized state
CREATE TABLE public.operational_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Snapshot metadata
  snapshot_type VARCHAR(50) NOT NULL,
  snapshot_version INTEGER NOT NULL DEFAULT 1,
  
  -- Temporal
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  
  -- Snapshot data (flexible JSON structure)
  snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Aggregation metadata
  total_lots INTEGER,
  total_animals INTEGER,
  total_cages INTEGER,
  occupied_cages INTEGER,
  active_breeding_groups INTEGER,
  
  -- Metadata
  generated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Index for temporal queries
  CONSTRAINT snapshot_type_check CHECK (snapshot_type IN ('daily_summary', 'weekly_summary', 'monthly_summary', 'full_state'))
);

-- ============================================================================
-- PROJECTION TABLES (MATERIALIZED VIEWS FOR FAST ACCESS)
-- ============================================================================

-- Current lot state projection
CREATE TABLE public.current_lot_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  lot_id UUID NOT NULL UNIQUE REFERENCES public.lots(id) ON DELETE CASCADE,
  
  -- Current state (denormalized for fast queries)
  code VARCHAR(50) NOT NULL,
  species_id VARCHAR(100) NOT NULL,
  strain VARCHAR(200),
  sex lot_sex_type NOT NULL,
  current_quantity INTEGER NOT NULL,
  status lot_status NOT NULL,
  location TEXT,
  cage_id UUID,
  cage_code VARCHAR(50),
  
  -- Lineage summary
  generation_depth INTEGER NOT NULL,
  ancestor_count INTEGER NOT NULL,
  descendant_count INTEGER NOT NULL,
  
  -- Statistics
  total_mortality INTEGER NOT NULL DEFAULT 0,
  total_additions INTEGER NOT NULL DEFAULT 0,
  subdivision_count INTEGER NOT NULL DEFAULT 0,
  
  -- Last activity
  last_event_at TIMESTAMPTZ,
  last_event_type TEXT,
  
  -- Timestamps (UTC)
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC'
);

-- Current cage occupancy projection
CREATE TABLE public.current_cage_occupancy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  cage_id UUID NOT NULL UNIQUE REFERENCES public.cages(id) ON DELETE CASCADE,
  
  -- Cage identity
  cage_code VARCHAR(50) NOT NULL,
  room_id UUID,
  zone_id UUID,
  rack_position VARCHAR(20),
  
  -- Occupancy state
  status cage_status NOT NULL,
  total_animals INTEGER NOT NULL DEFAULT 0,
  total_lots INTEGER NOT NULL DEFAULT 0,
  utilization_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_over_capacity BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Lot assignments (aggregated)
  assigned_lot_ids UUID[] DEFAULT '{}',
  assigned_lot_codes TEXT[] DEFAULT '{}',
  species_ids TEXT[] DEFAULT '{}',
  
  -- Capacity info
  max_animals INTEGER NOT NULL,
  remaining_capacity INTEGER NOT NULL,
  
  -- Last activity
  last_movement_at TIMESTAMPTZ,
  last_cleaned_at TIMESTAMPTZ,
  
  -- Timestamps (UTC)
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC'
);

-- Active breeding groups projection
CREATE TABLE public.active_breeding_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  breeding_group_id UUID NOT NULL UNIQUE REFERENCES public.breeding_groups(id) ON DELETE CASCADE,
  
  -- Group identity
  code VARCHAR(50) NOT NULL,
  species_id VARCHAR(100) NOT NULL,
  strain VARCHAR(200),
  
  -- Current state
  status breeding_group_status NOT NULL,
  cage_id UUID,
  cage_code VARCHAR(50),
  
  -- Composition
  sire_lot_id UUID,
  sire_lot_code VARCHAR(50),
  dam_lot_id UUID,
  dam_lot_code VARCHAR(50),
  dam_count INTEGER NOT NULL,
  
  -- Performance
  total_litters INTEGER NOT NULL DEFAULT 0,
  total_offspring INTEGER NOT NULL DEFAULT 0,
  last_litter_date TIMESTAMPTZ,
  
  -- Duration
  started_at TIMESTAMPTZ NOT NULL,
  days_active INTEGER NOT NULL,
  
  -- Timestamps (UTC)
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC'
);

-- Mortality summary projection
CREATE TABLE public.mortality_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Period
  period_type VARCHAR(20) NOT NULL,  -- daily, weekly, monthly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Aggregations
  total_mortality INTEGER NOT NULL DEFAULT 0,
  mortality_by_species JSONB DEFAULT '{}'::jsonb,
  mortality_by_strain JSONB DEFAULT '{}'::jsonb,
  mortality_by_cause JSONB DEFAULT '{}'::jsonb,
  mortality_rate_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Affected entities
  affected_lot_ids UUID[] DEFAULT '{}',
  affected_lot_count INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps (UTC)
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Unique constraint
  CONSTRAINT unique_mortality_period UNIQUE (workspace_id, period_type, period_start, period_end)
);

-- Operational dashboard snapshot
CREATE TABLE public.operational_dashboard_snapshot (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL,
  
  -- Snapshot time
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Inventory summary
  total_lots INTEGER NOT NULL DEFAULT 0,
  active_lots INTEGER NOT NULL DEFAULT 0,
  total_animals INTEGER NOT NULL DEFAULT 0,
  animals_by_species JSONB DEFAULT '{}'::jsonb,
  animals_by_status JSONB DEFAULT '{}'::jsonb,
  
  -- Cage summary
  total_cages INTEGER NOT NULL DEFAULT 0,
  available_cages INTEGER NOT NULL DEFAULT 0,
  occupied_cages INTEGER NOT NULL DEFAULT 0,
  cleaning_cages INTEGER NOT NULL DEFAULT 0,
  average_utilization_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Breeding summary
  active_breeding_groups INTEGER NOT NULL DEFAULT 0,
  total_litters_this_month INTEGER NOT NULL DEFAULT 0,
  total_offspring_this_month INTEGER NOT NULL DEFAULT 0,
  weaning_success_rate_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Mortality summary
  mortality_today INTEGER NOT NULL DEFAULT 0,
  mortality_this_week INTEGER NOT NULL DEFAULT 0,
  mortality_this_month INTEGER NOT NULL DEFAULT 0,
  
  -- Alerts
  critical_alerts INTEGER NOT NULL DEFAULT 0,
  warning_alerts INTEGER NOT NULL DEFAULT 0,
  
  -- Recent activity count
  events_last_24h INTEGER NOT NULL DEFAULT 0,
  movements_last_24h INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps (UTC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW() AT TIME ZONE 'UTC',
  
  -- Only one active snapshot at a time (optional constraint)
  CONSTRAINT one_active_dashboard_snapshot UNIQUE (workspace_id, instance_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Lots indexes
CREATE INDEX idx_lots_workspace ON public.lots(workspace_id);
CREATE INDEX idx_lots_instance ON public.lots(instance_id);
CREATE INDEX idx_lots_status ON public.lots(status);
CREATE INDEX idx_lots_species ON public.lots(species_id);
CREATE INDEX idx_lots_origin ON public.lots(origin_lot_id);
CREATE INDEX idx_lots_cage ON public.lots(cage_id);
CREATE INDEX idx_lots_archived ON public.lots(is_archived);
CREATE INDEX idx_lots_lineage ON public.lots USING GIN(ancestor_ids);
CREATE INDEX idx_lots_tags ON public.lots USING GIN(tags);

-- Lot events indexes
CREATE INDEX idx_lot_events_workspace ON public.lot_events(workspace_id);
CREATE INDEX idx_lot_events_lot ON public.lot_events(lot_id);
CREATE INDEX idx_lot_events_type ON public.lot_events(event_type);
CREATE INDEX idx_lot_events_occurred ON public.lot_events(occurred_at);
CREATE INDEX idx_lot_events_metadata ON public.lot_events USING GIN(metadata);
CREATE INDEX idx_lot_events_immutable ON public.lot_events(is_immutable);

-- Cages indexes
CREATE INDEX idx_cages_workspace ON public.cages(workspace_id);
CREATE INDEX idx_cages_instance ON public.cages(instance_id);
CREATE INDEX idx_cages_status ON public.cages(status);
CREATE INDEX idx_cages_room ON public.cages(room_id);
CREATE INDEX idx_cages_zone ON public.cages(zone_id);
CREATE INDEX idx_cages_active ON public.cages(is_active);
CREATE INDEX idx_cages_species_compat ON public.cages USING GIN(species_compatibility);

-- Cage movements indexes
CREATE INDEX idx_cage_movements_workspace ON public.cage_movements(workspace_id);
CREATE INDEX idx_cage_movements_lot ON public.cage_movements(lot_id);
CREATE INDEX idx_cage_movements_from ON public.cage_movements(from_cage_id);
CREATE INDEX idx_cage_movements_to ON public.cage_movements(to_cage_id);
CREATE INDEX idx_cage_movements_type ON public.cage_movements(movement_type);
CREATE INDEX idx_cage_movements_occurred ON public.cage_movements(occurred_at);
CREATE INDEX idx_cage_movements_immutable ON public.cage_movements(is_immutable);

-- Lot assignments indexes
CREATE INDEX idx_lot_assignments_workspace ON public.lot_assignments(workspace_id);
CREATE INDEX idx_lot_assignments_lot ON public.lot_assignments(lot_id);
CREATE INDEX idx_lot_assignments_cage ON public.lot_assignments(cage_id);
CREATE INDEX idx_lot_assignments_active ON public.lot_assignments(is_active);

-- Breeding groups indexes
CREATE INDEX idx_breeding_groups_workspace ON public.breeding_groups(workspace_id);
CREATE INDEX idx_breeding_groups_status ON public.breeding_groups(status);
CREATE INDEX idx_breeding_groups_sire ON public.breeding_groups(sire_lot_id);
CREATE INDEX idx_breeding_groups_dam ON public.breeding_groups(dam_lot_id);
CREATE INDEX idx_breeding_groups_cage ON public.breeding_groups(cage_id);

-- Litters indexes
CREATE INDEX idx_litters_workspace ON public.litters(workspace_id);
CREATE INDEX idx_litters_breeding_group ON public.litters(breeding_group_id);
CREATE INDEX idx_litters_dam ON public.litters(dam_lot_id);
CREATE INDEX idx_litters_birth_date ON public.litters(birth_date);

-- Operational events indexes
CREATE INDEX idx_operational_events_workspace ON public.operational_events(workspace_id);
CREATE INDEX idx_operational_events_type ON public.operational_events(event_type);
CREATE INDEX idx_operational_events_category ON public.operational_events(event_category);
CREATE INDEX idx_operational_events_lot ON public.operational_events(lot_id);
CREATE INDEX idx_operational_events_cage ON public.operational_events(cage_id);
CREATE INDEX idx_operational_events_occurred ON public.operational_events(occurred_at);
CREATE INDEX idx_operational_events_data ON public.operational_events USING GIN(event_data);
CREATE INDEX idx_operational_events_immutable ON public.operational_events(is_immutable);

-- Snapshots indexes
CREATE INDEX idx_operational_snapshots_workspace ON public.operational_snapshots(workspace_id);
CREATE INDEX idx_operational_snapshots_type ON public.operational_snapshots(snapshot_type);
CREATE INDEX idx_operational_snapshots_at ON public.operational_snapshots(snapshot_at);

-- Projection table indexes
CREATE INDEX idx_current_lot_state_workspace ON public.current_lot_state(workspace_id);
CREATE INDEX idx_current_lot_state_lot ON public.current_lot_state(lot_id);
CREATE INDEX idx_current_lot_state_status ON public.current_lot_state(status);

CREATE INDEX idx_current_cage_occupancy_workspace ON public.current_cage_occupancy(workspace_id);
CREATE INDEX idx_current_cage_occupancy_cage ON public.current_cage_occupancy(cage_id);
CREATE INDEX idx_current_cage_occupancy_status ON public.current_cage_occupancy(status);

CREATE INDEX idx_active_breeding_groups_workspace ON public.active_breeding_groups(workspace_id);
CREATE INDEX idx_active_breeding_groups_group ON public.active_breeding_groups(breeding_group_id);

CREATE INDEX idx_mortality_summary_workspace ON public.mortality_summary(workspace_id);
CREATE INDEX idx_mortality_summary_period ON public.mortality_summary(period_start, period_end);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cage_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breeding_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.litters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_lot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.current_cage_occupancy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_breeding_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_dashboard_snapshot ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR WORKSPACE ISOLATION
-- ============================================================================

-- Function to check workspace membership
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members wm
    JOIN public.profiles p ON p.id = wm.user_id
    WHERE wm.workspace_id = _workspace_id
    AND p.id = auth.uid()
  );
$$;

-- Lots policies
CREATE POLICY "Users can view lots in their workspace"
ON public.lots FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert lots"
ON public.lots FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace admins can update lots"
ON public.lots FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Lot events policies (IMMUTABLE - INSERT ONLY)
CREATE POLICY "Users can view lot events in their workspace"
ON public.lot_events FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert lot events"
ON public.lot_events FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  AND is_immutable = TRUE
);

-- NO UPDATE OR DELETE POLICIES FOR LOT_EVENTS (enforced immutability)

-- Cages policies
CREATE POLICY "Users can view cages in their workspace"
ON public.cages FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert cages"
ON public.cages FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace admins can update cages"
ON public.cages FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Cage movements policies (IMMUTABLE - INSERT ONLY)
CREATE POLICY "Users can view cage movements in their workspace"
ON public.cage_movements FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert cage movements"
ON public.cage_movements FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  AND is_immutable = TRUE
);

-- NO UPDATE OR DELETE POLICIES FOR CAGE_MOVEMENTS (enforced immutability)

-- Lot assignments policies
CREATE POLICY "Users can view lot assignments in their workspace"
ON public.lot_assignments FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert lot assignments"
ON public.lot_assignments FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace admins can update lot assignments"
ON public.lot_assignments FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Breeding groups policies
CREATE POLICY "Users can view breeding groups in their workspace"
ON public.breeding_groups FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert breeding groups"
ON public.breeding_groups FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace admins can update breeding groups"
ON public.breeding_groups FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Litters policies
CREATE POLICY "Users can view litters in their workspace"
ON public.litters FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert litters"
ON public.litters FOR INSERT TO authenticated
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace admins can update litters"
ON public.litters FOR UPDATE TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Operational events policies (IMMUTABLE - INSERT ONLY)
CREATE POLICY "Users can view operational events in their workspace"
ON public.operational_events FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace members can insert operational events"
ON public.operational_events FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
  AND is_immutable = TRUE
);

-- NO UPDATE OR DELETE POLICIES FOR OPERATIONAL_EVENTS (enforced immutability)

-- Operational snapshots policies
CREATE POLICY "Users can view operational snapshots in their workspace"
ON public.operational_snapshots FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Workspace admins can insert operational snapshots"
ON public.operational_snapshots FOR INSERT TO authenticated
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- Projection tables policies (read-only for most users)
CREATE POLICY "Users can view current lot state"
ON public.current_lot_state FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "System can update current lot state"
ON public.current_lot_state FOR ALL TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'system'
  )
);

CREATE POLICY "Users can view current cage occupancy"
ON public.current_cage_occupancy FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "System can update current cage occupancy"
ON public.current_cage_occupancy FOR ALL TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members 
    WHERE user_id = auth.uid() AND role = 'system'
  )
);

CREATE POLICY "Users can view active breeding groups"
ON public.active_breeding_groups FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can view mortality summary"
ON public.mortality_summary FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can view dashboard snapshot"
ON public.operational_dashboard_snapshot FOR SELECT TO authenticated
USING (workspace_id IN (
  SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
));

-- ============================================================================
-- TRIGGER FUNCTIONS FOR AUTOMATIC PROJECTION UPDATES
-- ============================================================================

-- Trigger function to update lot's updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW() AT TIME ZONE 'UTC';
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER trg_lots_updated_at
BEFORE UPDATE ON public.lots
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_cages_updated_at
BEFORE UPDATE ON public.cages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lot_assignments_updated_at
BEFORE UPDATE ON public.lot_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_breeding_groups_updated_at
BEFORE UPDATE ON public.breeding_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_litters_updated_at
BEFORE UPDATE ON public.litters
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS FOR OPERATIONAL QUERIES
-- ============================================================================

-- Get lot lineage chain
CREATE OR REPLACE FUNCTION public.get_lot_lineage_chain(_lot_id UUID)
RETURNS TABLE(
  lot_id UUID,
  code VARCHAR,
  species_id VARCHAR,
  generation_depth INTEGER,
  relationship TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE lineage AS (
    SELECT 
      l.id,
      l.code,
      l.species_id,
      l.generation_depth,
      'self'::TEXT as relationship
    FROM public.lots l
    WHERE l.id = _lot_id
    
    UNION ALL
    
    SELECT 
      parent.id,
      parent.code,
      parent.species_id,
      parent.generation_depth,
      'ancestor'::TEXT
    FROM public.lots parent
    JOIN lineage child ON parent.id = child.lot_id
    WHERE parent.origin_lot_id IS NOT NULL
  )
  SELECT * FROM lineage;
END;
$$;

-- Get cage occupancy at a point in time
CREATE OR REPLACE FUNCTION public.get_cage_occupancy_at_time(
  _cage_id UUID,
  _at_time TIMESTAMPTZ
)
RETURNS TABLE(
  total_animals INTEGER,
  total_lots INTEGER,
  lot_ids UUID[],
  lot_codes TEXT[]
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_animals INTEGER := 0;
  v_total_lots INTEGER := 0;
  v_lot_ids UUID[] := '{}';
  v_lot_codes TEXT[] := '{}';
BEGIN
  -- Find lots that were in this cage at the specified time
  SELECT 
    COUNT(DISTINCT la.lot_id)::INTEGER,
    ARRAY_AGG(DISTINCT la.lot_id),
    ARRAY_AGG(DISTINCT l.code)
  INTO v_total_lots, v_lot_ids, v_lot_codes
  FROM public.lot_assignments la
  JOIN public.lots l ON l.id = la.lot_id
  WHERE la.cage_id = _cage_id
    AND la.assigned_at <= _at_time
    AND (la.ended_at IS NULL OR la.ended_at > _at_time)
    AND la.is_active = TRUE;
  
  -- Sum quantities from lot events up to that time
  SELECT COALESCE(SUM(current_quantity), 0)
  INTO v_total_animals
  FROM public.lots
  WHERE id = ANY(v_lot_ids);
  
  RETURN QUERY SELECT v_total_animals, v_total_lots, v_lot_ids, v_lot_codes;
END;
$$;

-- Get movement history for a lot
CREATE OR REPLACE FUNCTION public.get_lot_movement_history(_lot_id UUID)
RETURNS TABLE(
  movement_id UUID,
  from_cage_id UUID,
  from_cage_code VARCHAR,
  to_cage_id UUID,
  to_cage_code VARCHAR,
  movement_type movement_type,
  occurred_at TIMESTAMPTZ,
  reason TEXT,
  notes TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.from_cage_id,
    fc.code,
    cm.to_cage_id,
    tc.code,
    cm.movement_type,
    cm.occurred_at,
    cm.reason,
    cm.notes
  FROM public.cage_movements cm
  LEFT JOIN public.cages fc ON fc.id = cm.from_cage_id
  LEFT JOIN public.cages tc ON tc.id = cm.to_cage_id
  WHERE cm.lot_id = _lot_id
  ORDER BY cm.occurred_at ASC;
END;
$$;

-- Calculate mortality rate for a period
CREATE OR REPLACE FUNCTION public.calculate_mortality_rate(
  _workspace_id UUID,
  _start_date TIMESTAMPTZ,
  _end_date TIMESTAMPTZ
)
RETURNS TABLE(
  total_mortality INTEGER,
  starting_population INTEGER,
  mortality_rate_percent NUMERIC
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_total_mortality INTEGER := 0;
  v_starting_population INTEGER := 0;
BEGIN
  -- Count mortality events in period
  SELECT COALESCE(COUNT(*), 0)
  INTO v_total_mortality
  FROM public.operational_events
  WHERE workspace_id = _workspace_id
    AND event_type = 'lot_mortality'
    AND occurred_at BETWEEN _start_date AND _end_date;
  
  -- Get starting population
  SELECT COALESCE(SUM(current_quantity), 0)
  INTO v_starting_population
  FROM public.lots
  WHERE workspace_id = _workspace_id
    AND status != 'deceased'
    AND created_at < _start_date;
  
  RETURN QUERY SELECT 
    v_total_mortality,
    v_starting_population,
    CASE 
      WHEN v_starting_population = 0 THEN 0
      ELSE (v_total_mortality::NUMERIC / v_starting_population * 100)::NUMERIC(5,2)
    END;
END;
$$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.lots IS 'Current materialized state of animal lots. Primary operational entity.';
COMMENT ON TABLE public.lot_events IS 'IMMUTABLE event log for lot lifecycle events. INSERT ONLY. Source of truth.';
COMMENT ON TABLE public.cages IS 'Current materialized state of cages (housing units).';
COMMENT ON TABLE public.cage_movements IS 'IMMUTABLE movement log for lot transfers between cages. INSERT ONLY.';
COMMENT ON TABLE public.lot_assignments IS 'Current active lot-to-cage assignments. Materialized for fast queries.';
COMMENT ON TABLE public.breeding_groups IS 'Active and historical breeding group records.';
COMMENT ON TABLE public.litters IS 'Litter birth records linked to breeding groups and dams.';
COMMENT ON TABLE public.operational_events IS 'UNIVERSAL IMMUTABLE event log for all operational events. INSERT ONLY.';
COMMENT ON TABLE public.operational_snapshots IS 'Point-in-time snapshots of operational state for historical analysis.';
COMMENT ON TABLE public.current_lot_state IS 'Materialized projection of current lot state for fast dashboard queries.';
COMMENT ON TABLE public.current_cage_occupancy IS 'Materialized projection of current cage occupancy for fast queries.';
COMMENT ON TABLE public.active_breeding_groups IS 'Materialized projection of active breeding groups.';
COMMENT ON TABLE public.mortality_summary IS 'Aggregated mortality statistics by period.';
COMMENT ON TABLE public.operational_dashboard_snapshot IS 'Real-time operational dashboard metrics.';

COMMENT ON COLUMN public.lots.species_id IS 'Reference to species entity (string ID, not hardcoded enum). Allows flexibility.';
COMMENT ON COLUMN public.lot_events.is_immutable IS 'Marker indicating this record must never be modified. Enforced by RLS.';
COMMENT ON COLUMN public.cage_movements.is_immutable IS 'Marker indicating this record must never be modified. Enforced by RLS.';
COMMENT ON COLUMN public.operational_events.is_immutable IS 'Marker indicating this record must never be modified. Enforced by RLS.';
COMMENT ON COLUMN public.operational_events.event_hash IS 'SHA-256 hash of event data for integrity verification.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
-- Migration: Add size_class_id to Lots and migrate from hardcoded Etapas
-- 
-- CRITICAL PRINCIPLES:
-- - Inventory systems must use sizeClassId references instead of hardcoded strings
-- - No cross-domain contamination

-- ============================================================================
-- 1. ADD COLUMN TO LOTS
-- ============================================================================

-- Add size_class_id to public.lots
ALTER TABLE public.lots
  ADD COLUMN size_class_id UUID REFERENCES public.species_size_classes(id) ON DELETE SET NULL;

CREATE INDEX idx_lots_size_class ON public.lots(size_class_id);

-- Add size_class_id to public.current_lot_state
ALTER TABLE public.current_lot_state
  ADD COLUMN size_class_id UUID REFERENCES public.species_size_classes(id) ON DELETE SET NULL,
  ADD COLUMN size_class_name VARCHAR(100);

CREATE INDEX idx_current_lot_state_size_class ON public.current_lot_state(size_class_id);

-- ============================================================================
-- 2. CREATE DEFAULT WORKSPACE SPECIES PROFILES
-- ============================================================================
-- This script safely injects the standard ASF/Rat/Mouse blueprints for existing
-- workspaces so that legacy inventory data has something to link to.

DO $$
DECLARE
  ws RECORD;
  profile_asf UUID;
  profile_mouse UUID;
  profile_rat UUID;
BEGIN
  FOR ws IN SELECT id FROM public.workspaces WHERE is_active = true
  LOOP
    -- 1. Create ASF Profile if missing
    IF NOT EXISTS (SELECT 1 FROM public.workspace_species_profiles WHERE workspace_id = ws.id AND species_id = 'asf') THEN
      INSERT INTO public.workspace_species_profiles (workspace_id, species_id, species_name, operational_name, is_starter_blueprint, is_custom)
      VALUES (ws.id, 'asf', 'ASF', 'ASF', true, false) RETURNING id INTO profile_asf;

      -- Add size classes for ASF
      INSERT INTO public.species_size_classes (workspace_id, species_profile_id, name, min_weight_grams, max_weight_grams, min_age_days, max_age_days, sale_price, display_order, is_active, is_default, is_custom)
      VALUES 
        (ws.id, profile_asf, 'Pinky', 1, 3, 0, 6, 15.0, 1, true, false, false),
        (ws.id, profile_asf, 'Fuzzy', 3, 7, 7, 14, 18.0, 2, true, false, false),
        (ws.id, profile_asf, 'Hopper', 7, 15, 15, 21, 23.0, 3, true, false, false),
        (ws.id, profile_asf, 'Destetada', 15, 25, 22, 35, 30.0, 4, true, false, false),
        (ws.id, profile_asf, 'Chico', 25, 40, 36, 50, 33.0, 5, true, false, false),
        (ws.id, profile_asf, 'Mediano', 40, 60, 51, 70, 37.0, 6, true, false, false),
        (ws.id, profile_asf, 'Grande', 60, NULL, 71, NULL, 42.0, 7, true, true, false);
        
      -- Add operational settings
      INSERT INTO public.species_operational_settings (workspace_id, species_profile_id, breeding_cycle_days, expected_weaning_age_days, expected_gestation_days, maturity_age_days)
      VALUES (ws.id, profile_asf, 4, 21, 23, 42);
    END IF;

    -- 2. Create Mouse Profile if missing
    IF NOT EXISTS (SELECT 1 FROM public.workspace_species_profiles WHERE workspace_id = ws.id AND species_id = 'mouse') THEN
      INSERT INTO public.workspace_species_profiles (workspace_id, species_id, species_name, operational_name, is_starter_blueprint, is_custom)
      VALUES (ws.id, 'mouse', 'Ratón', 'Ratón', true, false) RETURNING id INTO profile_mouse;

      -- Add size classes for Mouse
      INSERT INTO public.species_size_classes (workspace_id, species_profile_id, name, min_weight_grams, max_weight_grams, min_age_days, max_age_days, sale_price, display_order, is_active, is_default, is_custom)
      VALUES 
        (ws.id, profile_mouse, 'Pinky', 1, 3, 0, 6, 16.0, 1, true, false, false),
        (ws.id, profile_mouse, 'Fuzzy', 3, 8, 7, 14, 19.0, 2, true, false, false),
        (ws.id, profile_mouse, 'Hopper', 8, 16, 15, 21, 26.0, 3, true, false, false),
        (ws.id, profile_mouse, 'Destetada', 16, 22, 22, 34, 30.0, 4, true, false, false),
        (ws.id, profile_mouse, 'Chico', 22, 30, 35, 50, 33.0, 5, true, false, false),
        (ws.id, profile_mouse, 'Mediano', 30, 45, 51, 70, 38.0, 6, true, false, false),
        (ws.id, profile_mouse, 'Grande', 45, NULL, 71, NULL, 43.0, 7, true, true, false);
        
      INSERT INTO public.species_operational_settings (workspace_id, species_profile_id, breeding_cycle_days, expected_weaning_age_days, expected_gestation_days, maturity_age_days)
      VALUES (ws.id, profile_mouse, 4, 21, 21, 42);
    END IF;

    -- 3. Create Rat Profile if missing
    IF NOT EXISTS (SELECT 1 FROM public.workspace_species_profiles WHERE workspace_id = ws.id AND species_id = 'rat') THEN
      INSERT INTO public.workspace_species_profiles (workspace_id, species_id, species_name, operational_name, is_starter_blueprint, is_custom)
      VALUES (ws.id, 'rat', 'Rata', 'Rata', true, false) RETURNING id INTO profile_rat;

      -- Add size classes for Rat
      INSERT INTO public.species_size_classes (workspace_id, species_profile_id, name, min_weight_grams, max_weight_grams, min_age_days, max_age_days, sale_price, display_order, is_active, is_default, is_custom)
      VALUES 
        (ws.id, profile_rat, 'Pinky', 0, 16, 0, 5, 16.0, 1, true, false, false),
        (ws.id, profile_rat, 'Fuzzy', 16, 30, 6, 9, 18.0, 2, true, false, false),
        (ws.id, profile_rat, 'Hopper', 31, 50, 10, 18, 23.0, 3, true, false, false),
        (ws.id, profile_rat, 'Destetada', 51, 70, 19, 26, 30.0, 4, true, false, false),
        (ws.id, profile_rat, 'Chico', 71, 90, 27, 30, 33.0, 5, true, false, false),
        (ws.id, profile_rat, 'Mediano', 91, 120, 31, 36, 37.0, 6, true, false, false),
        (ws.id, profile_rat, 'Grande', 121, 150, 37, 42, 40.0, 7, true, true, false),
        (ws.id, profile_rat, 'Extra Grande', 151, 200, 43, 48, 50.0, 8, true, false, false),
        (ws.id, profile_rat, 'Jumbo', 201, 250, 49, 54, 55.0, 9, true, false, false),
        (ws.id, profile_rat, 'Extra Jumbo', 251, 300, 55, 64, 60.0, 10, true, false, false),
        (ws.id, profile_rat, 'Mega', 301, 349, 65, 74, 65.0, 11, true, false, false),
        (ws.id, profile_rat, 'Extra Mega', 350, 400, 75, 99, 75.0, 12, true, false, false),
        (ws.id, profile_rat, 'Ratota', 401, NULL, 100, NULL, 80.0, 13, true, false, false);
        
      INSERT INTO public.species_operational_settings (workspace_id, species_profile_id, breeding_cycle_days, expected_weaning_age_days, expected_gestation_days, maturity_age_days)
      VALUES (ws.id, profile_rat, 4, 21, 23, 50);
    END IF;

  END LOOP;
END $$;

-- ============================================================================
-- 3. LINK EXISTING LOTS TO NEW SIZE CLASSES
-- ============================================================================

DO $$
DECLARE
  lot_row RECORD;
  resolved_species_id TEXT;
  profile_id UUID;
  sc_id UUID;
  sc_name VARCHAR(100);
  age_days INTEGER;
BEGIN
  FOR lot_row IN SELECT * FROM public.lots WHERE is_archived = false
  LOOP
    -- Normalize species ID from legacy 'Raton' / 'Rata' to 'mouse' / 'rat'
    IF lower(lot_row.species_id) = 'raton' OR lower(lot_row.species_id) = 'ratón' OR lower(lot_row.species_id) = 'mouse' THEN
      resolved_species_id := 'mouse';
    ELSIF lower(lot_row.species_id) = 'rata' OR lower(lot_row.species_id) = 'rat' THEN
      resolved_species_id := 'rat';
    ELSIF lower(lot_row.species_id) = 'asf' THEN
      resolved_species_id := 'asf';
    ELSE
      -- Fallback
      resolved_species_id := lower(lot_row.species_id);
    END IF;

    -- Find matching species profile
    SELECT id INTO profile_id 
    FROM public.workspace_species_profiles 
    WHERE workspace_id = lot_row.workspace_id AND species_id = resolved_species_id
    LIMIT 1;

    IF profile_id IS NOT NULL THEN
      -- Calculate age
      IF lot_row.birth_date IS NOT NULL THEN
        age_days := extract(day from now() - lot_row.birth_date)::INTEGER;
      ELSE
        age_days := 999; -- Adult default if unknown
      END IF;

      -- Find matching size class by age
      SELECT id, name INTO sc_id, sc_name 
      FROM public.species_size_classes 
      WHERE workspace_id = lot_row.workspace_id 
        AND species_profile_id = profile_id
        AND age_days >= min_age_days 
        AND (age_days <= max_age_days OR max_age_days IS NULL)
      ORDER BY min_age_days DESC
      LIMIT 1;

      -- Fallback to default
      IF sc_id IS NULL THEN
        SELECT id, name INTO sc_id, sc_name 
        FROM public.species_size_classes 
        WHERE workspace_id = lot_row.workspace_id 
          AND species_profile_id = profile_id
          AND is_default = true
        LIMIT 1;
      END IF;

      -- Update the tables
      IF sc_id IS NOT NULL THEN
        UPDATE public.lots SET size_class_id = sc_id WHERE id = lot_row.id;
        UPDATE public.current_lot_state SET size_class_id = sc_id, size_class_name = sc_name WHERE lot_id = lot_row.id;
      END IF;
    END IF;
  END LOOP;
END $$;
-- Migration: Inventory Reservations Table
--
-- Reservations claim inventory WITHOUT mutating source lots.
-- Availability = derived stock - SUM(active reservations).
--
-- CRITICAL:
-- - Reservations do NOT change lot.cantidad_actual
-- - Historical lot quantities remain immutable
-- - Only status transitions are allowed (active → fulfilled/cancelled/expired)

-- ============================================================================
-- 1. INVENTORY RESERVATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,

  -- What is reserved
  species_profile_id UUID NOT NULL REFERENCES public.workspace_species_profiles(id) ON DELETE CASCADE,
  size_class_id      UUID NOT NULL REFERENCES public.species_size_classes(id) ON DELETE RESTRICT,
  quantity           INTEGER NOT NULL CHECK (quantity > 0),

  -- Who reserved it
  customer_id        UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  customer_name      VARCHAR(255),
  order_id           UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,

  -- Lifecycle
  status             VARCHAR(20) NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'fulfilled', 'cancelled', 'expired')),
  
  -- Partial fulfillment tracking (immutable once set — tracked by append)
  fulfilled_quantity INTEGER NOT NULL DEFAULT 0 CHECK (fulfilled_quantity >= 0),
  remaining_quantity INTEGER NOT NULL CHECK (remaining_quantity >= 0),

  -- Temporal
  expires_at         TIMESTAMPTZ,
  fulfilled_at       TIMESTAMPTZ,
  cancelled_at       TIMESTAMPTZ,

  -- Metadata
  notes              TEXT,
  created_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_workspace 
  ON public.inventory_reservations(workspace_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_species_size 
  ON public.inventory_reservations(workspace_id, species_profile_id, size_class_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status 
  ON public.inventory_reservations(workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order 
  ON public.inventory_reservations(order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_customer
  ON public.inventory_reservations(customer_id)
  WHERE customer_id IS NOT NULL;

-- updated_at auto-update trigger
CREATE OR REPLACE FUNCTION public.update_inventory_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_reservations_updated_at ON public.inventory_reservations;
CREATE TRIGGER trg_inventory_reservations_updated_at
  BEFORE UPDATE ON public.inventory_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_reservations_updated_at();

-- ============================================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;

-- Users can only see reservations within their workspace
CREATE POLICY "inventory_reservations_workspace_isolation"
  ON public.inventory_reservations
  FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

-- ============================================================================
-- 3. INVENTORY MOVEMENT HISTORY TABLE
-- ============================================================================

-- Immutable audit log. NEVER delete or update rows.
CREATE TABLE IF NOT EXISTS public.inventory_movement_history (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID NOT NULL,

  movement_type        VARCHAR(50) NOT NULL,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- References
  species_profile_id   UUID,
  size_class_id        UUID,
  lot_id               UUID,
  reservation_id       UUID,

  -- Quantities
  quantity_before      INTEGER,
  quantity_after       INTEGER,
  quantity_delta       INTEGER GENERATED ALWAYS AS (
    CASE WHEN quantity_before IS NOT NULL AND quantity_after IS NOT NULL
         THEN quantity_after - quantity_before
         ELSE NULL
    END
  ) STORED,

  -- Human-readable summary (denormalized for query performance)
  summary              TEXT NOT NULL,
  species_name         VARCHAR(100),
  size_class_name      VARCHAR(100),

  -- Actor
  actor_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Prevent any modifications after insertion
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No UPDATE or DELETE allowed — history is immutable
CREATE POLICY "inventory_movement_history_read_only_after_insert"
  ON public.inventory_movement_history
  FOR SELECT
  USING (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "inventory_movement_history_insert_only"
  ON public.inventory_movement_history
  FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM public.profiles WHERE id = auth.uid()
  ));

ALTER TABLE public.inventory_movement_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inventory_movement_workspace 
  ON public.inventory_movement_history(workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movement_lot 
  ON public.inventory_movement_history(lot_id)
  WHERE lot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_movement_reservation 
  ON public.inventory_movement_history(reservation_id)
  WHERE reservation_id IS NOT NULL;
