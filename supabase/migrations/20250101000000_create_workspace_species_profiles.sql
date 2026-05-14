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
