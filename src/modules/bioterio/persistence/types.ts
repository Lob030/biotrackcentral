/**
 * Bioterio Operational Persistence Types
 * 
 * Type definitions for the hybrid event-driven persistence layer.
 * These types bridge the runtime system with Supabase storage.
 */

import type { Lot, LotStatus, LotSexType, LotSourceType, SpeciesId } from '../lots/runtime/types';
import type { Cage, CageStatus, CageMovement, LotAssignment } from '../cages/runtime/types';

// ============================================================================
// CORE ENTITY TYPES (Supabase-compatible)
// ============================================================================

/**
 * Workspace-scoped lot record
 */
export interface LotRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Identity
  code: string;
  
  // Biological attributes
  species_id: SpeciesId;
  strain?: string;
  sex: LotSexType;
  
  // Population
  initial_quantity: number;
  current_quantity: number;
  
  // Dates
  birth_date?: string;  // ISO 8601
  acquisition_date?: string;  // ISO 8601
  
  // Origin tracking
  source_type: LotSourceType;
  origin_lot_id?: string;
  supplier_name?: string;
  
  // Operational state
  status: LotStatus;
  location?: string;
  cage_id?: string;
  
  // Lineage
  generation_depth: number;
  ancestor_ids: string[];
  
  // Metadata
  notes?: string;
  tags?: string[];
  is_archived: boolean;
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Immutable lot event record
 */
export interface LotEventRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Event reference
  lot_id: string;
  event_type: string;
  event_category: string;
  
  // Event data
  quantity_affected?: number;
  previous_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  reason?: string;
  metadata: Record<string, unknown>;
  
  // Actor/context
  performed_by?: string;
  performed_by_name?: string;
  
  // Timestamps (UTC)
  occurred_at: string;  // ISO 8601
  recorded_at: string;  // ISO 8601
  
  // Immutable marker
  is_immutable: true;
}

/**
 * Workspace-scoped cage record
 */
export interface CageRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Identity
  code: string;
  
  // Location hierarchy
  room_id?: string;
  zone_id?: string;
  rack_position?: string;
  
  // Capacity configuration
  max_animals: number;
  max_lots?: number;
  volume_liters?: number;
  floor_area_cm2?: number;
  species_compatibility?: string[];
  
  // Environmental monitoring
  temperature_celsius?: number;
  humidity_percent?: number;
  light_cycle?: string;
  
  // Operational state
  status: CageStatus;
  is_active: boolean;
  
  // Maintenance tracking
  last_cleaned_at?: string;  // ISO 8601
  last_maintenance_at?: string;  // ISO 8601
  cleaning_interval_days?: number;
  
  // Metadata
  notes?: string;
  tags?: string[];
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Immutable cage movement record
 */
export interface CageMovementRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Movement reference
  lot_id: string;
  from_cage_id?: string;
  to_cage_id?: string;
  movement_type: 'initial_assignment' | 'transfer' | 'relocation' | 'removal';
  
  // Movement details
  quantity_moved?: number;
  reason?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  
  // Actor/context
  performed_by?: string;
  performed_by_name?: string;
  
  // Timestamps (UTC)
  occurred_at: string;  // ISO 8601
  recorded_at: string;  // ISO 8601
  
  // Immutable marker
  is_immutable: true;
}

/**
 * Active lot assignment record
 */
export interface LotAssignmentRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Assignment reference
  lot_id: string;
  cage_id: string;
  
  // Assignment details
  assigned_at: string;  // ISO 8601
  quantity_at_assignment: number;
  notes?: string;
  
  // Status
  is_active: boolean;
  ended_at?: string;  // ISO 8601
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Breeding group record
 */
export interface BreedingGroupRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Identity
  code: string;
  
  // Breeding composition
  sire_lot_id?: string;
  dam_lot_id?: string;
  dam_count: number;
  
  // Breeding parameters
  species_id: SpeciesId;
  strain?: string;
  breeding_protocol?: string;
  target_offspring_count?: number;
  
  // Operational state
  status: 'active' | 'paused' | 'completed' | 'dissolved';
  cage_id?: string;
  
  // Timeline
  started_at: string;  // ISO 8601
  completed_at?: string;  // ISO 8601
  
  // Results tracking
  total_litters_born: number;
  total_offspring_born: number;
  successful_weanings: number;
  
  // Metadata
  notes?: string;
  tags?: string[];
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Litter record
 */
export interface LitterRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Parentage
  breeding_group_id: string;
  sire_lot_id?: string;
  dam_lot_id: string;
  
  // Litter data
  born_count: number;
  live_births: number;
  stillbirths: number;
  weaned_count: number;
  
  // Birth details
  birth_date: string;  // ISO 8601
  weaning_date?: string;  // ISO 8601
  offspring_lot_id?: string;
  
  // Health/viability
  viability_notes?: string;
  anomalies_detected?: string[];
  
  // Metadata
  notes?: string;
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Universal operational event record
 */
export interface OperationalEventRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Event classification
  event_type: string;
  event_category: string;
  
  // Entity references (polymorphic)
  lot_id?: string;
  cage_id?: string;
  breeding_group_id?: string;
  litter_id?: string;
  
  // Event payload
  event_data: Record<string, unknown>;
  previous_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  
  // Context
  reason?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  
  // Actor
  performed_by?: string;
  performed_by_name?: string;
  
  // Timestamps (UTC)
  occurred_at: string;  // ISO 8601
  recorded_at: string;  // ISO 8601
  
  // Immutable marker
  is_immutable: true;
  
  // Hash for integrity verification
  event_hash?: string;
}

/**
 * Operational snapshot record
 */
export interface OperationalSnapshotRecord {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Snapshot metadata
  snapshot_type: 'daily_summary' | 'weekly_summary' | 'monthly_summary' | 'full_state';
  snapshot_version: number;
  
  // Temporal
  snapshot_at: string;  // ISO 8601
  period_start?: string;  // ISO 8601
  period_end?: string;  // ISO 8601
  
  // Snapshot data
  snapshot_data: Record<string, unknown>;
  
  // Aggregation metadata
  total_lots?: number;
  total_animals?: number;
  total_cages?: number;
  occupied_cages?: number;
  active_breeding_groups?: number;
  
  // Metadata
  generated_by?: string;
  notes?: string;
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
}

// ============================================================================
// PROJECTION TYPES (MATERIALIZED VIEWS)
// ============================================================================

/**
 * Current lot state projection
 */
export interface CurrentLotStateProjection {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  lot_id: string;
  
  // Current state
  code: string;
  species_id: SpeciesId;
  strain?: string;
  sex: LotSexType;
  current_quantity: number;
  status: LotStatus;
  location?: string;
  cage_id?: string;
  cage_code?: string;
  
  // Lineage summary
  generation_depth: number;
  ancestor_count: number;
  descendant_count: number;
  
  // Statistics
  total_mortality: number;
  total_additions: number;
  subdivision_count: number;
  
  // Last activity
  last_event_at?: string;  // ISO 8601
  last_event_type?: string;
  
  // Timestamps (UTC)
  computed_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Current cage occupancy projection
 */
export interface CurrentCageOccupancyProjection {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  cage_id: string;
  
  // Cage identity
  cage_code: string;
  room_id?: string;
  zone_id?: string;
  rack_position?: string;
  
  // Occupancy state
  status: CageStatus;
  total_animals: number;
  total_lots: number;
  utilization_percent: number;
  is_over_capacity: boolean;
  
  // Lot assignments (aggregated)
  assigned_lot_ids: string[];
  assigned_lot_codes: string[];
  species_ids: string[];
  
  // Capacity info
  max_animals: number;
  remaining_capacity: number;
  
  // Last activity
  last_movement_at?: string;  // ISO 8601
  last_cleaned_at?: string;  // ISO 8601
  
  // Timestamps (UTC)
  computed_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Active breeding groups projection
 */
export interface ActiveBreedingGroupsProjection {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  breeding_group_id: string;
  
  // Group identity
  code: string;
  species_id: SpeciesId;
  strain?: string;
  
  // Current state
  status: 'active' | 'paused' | 'completed' | 'dissolved';
  cage_id?: string;
  cage_code?: string;
  
  // Composition
  sire_lot_id?: string;
  sire_lot_code?: string;
  dam_lot_id?: string;
  dam_lot_code?: string;
  dam_count: number;
  
  // Performance
  total_litters: number;
  total_offspring: number;
  last_litter_date?: string;  // ISO 8601
  
  // Duration
  started_at: string;  // ISO 8601
  days_active: number;
  
  // Timestamps (UTC)
  computed_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Mortality summary projection
 */
export interface MortalitySummaryProjection {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Period
  period_type: 'daily' | 'weekly' | 'monthly';
  period_start: string;  // ISO 8601
  period_end: string;  // ISO 8601
  
  // Aggregations
  total_mortality: number;
  mortality_by_species: Record<string, number>;
  mortality_by_strain: Record<string, number>;
  mortality_by_cause: Record<string, number>;
  mortality_rate_percent: number;
  
  // Affected entities
  affected_lot_ids: string[];
  affected_lot_count: number;
  
  // Timestamps (UTC)
  computed_at: string;  // ISO 8601
  updated_at: string;  // ISO 8601
}

/**
 * Operational dashboard snapshot
 */
export interface OperationalDashboardSnapshot {
  id: string;
  workspace_id: string;
  instance_id: string;
  
  // Snapshot time
  snapshot_at: string;  // ISO 8601
  
  // Inventory summary
  total_lots: number;
  active_lots: number;
  total_animals: number;
  animals_by_species: Record<string, number>;
  animals_by_status: Record<string, number>;
  
  // Cage summary
  total_cages: number;
  available_cages: number;
  occupied_cages: number;
  cleaning_cages: number;
  average_utilization_percent: number;
  
  // Breeding summary
  active_breeding_groups: number;
  total_litters_this_month: number;
  total_offspring_this_month: number;
  weaning_success_rate_percent: number;
  
  // Mortality summary
  mortality_today: number;
  mortality_this_week: number;
  mortality_this_month: number;
  
  // Alerts
  critical_alerts: number;
  warning_alerts: number;
  
  // Recent activity count
  events_last_24h: number;
  movements_last_24h: number;
  
  // Timestamps (UTC)
  created_at: string;  // ISO 8601
}

// ============================================================================
// PERSISTENCE SERVICE INTERFACES
// ============================================================================

/**
 * Result of a persistence operation
 */
export interface PersistenceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  eventId?: string;  // ID of the recorded event
}

/**
 * Temporal query options
 */
export interface TemporalQueryOptions {
  startTime?: Date;
  endTime?: Date;
  asOfDate?: Date;  // Point-in-time query
}

/**
 * Projection rebuild options
 */
export interface RebuildProjectionOptions {
  lotId?: string;
  cageId?: string;
  breedingGroupId?: string;
  fullRebuild?: boolean;
}
