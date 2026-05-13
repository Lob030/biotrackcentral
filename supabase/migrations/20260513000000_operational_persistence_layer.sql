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
