/**
 * Bioterio Operational Persistence Services
 * 
 * Runtime persistence services for the hybrid event-driven architecture.
 * These services bridge the operational runtime with Supabase storage.
 * 
 * ARCHITECTURAL PRINCIPLES:
 * 1. Events are IMMUTABLE (INSERT ONLY)
 * 2. Current state is materialized for fast access
 * 3. Projections are rebuilt from events when needed
 * 4. Dashboards consume projections, not raw events
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  LotRecord,
  LotEventRecord,
  CageRecord,
  CageMovementRecord,
  LotAssignmentRecord,
  BreedingGroupRecord,
  LitterRecord,
  OperationalEventRecord,
  OperationalSnapshotRecord,
  CurrentLotStateProjection,
  CurrentCageOccupancyProjection,
  ActiveBreedingGroupsProjection,
  MortalitySummaryProjection,
  OperationalDashboardSnapshot,
  PersistenceResult,
  TemporalQueryOptions,
  RebuildProjectionOptions,
} from './types';

import type { Lot, LotLifecycleEvent, LotStatus } from '../lots/runtime/types';
import type { Cage, CageMovement, CageStatus } from '../cages/runtime/types';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate SHA-256 hash for event integrity verification
 */
async function hashEvent(data: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const dataStr = JSON.stringify(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(dataStr));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert Date to ISO 8601 UTC string
 */
function toUTCString(date: Date | string | undefined): string | undefined {
  if (!date) return undefined;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * Get current workspace context
 */
function getCurrentWorkspaceContext(): { workspace_id: string; instance_id: string } {
  // TODO: Replace with actual workspace context retrieval
  // This should come from the workspace management system
  return {
    workspace_id: '00000000-0000-0000-0000-000000000000',
    instance_id: '00000000-0000-0000-0000-000000000000',
  };
}

// ============================================================================
// OPERATIONAL EVENT PERSISTENCE
// ============================================================================

/**
 * Persist an operational event (IMMUTABLE - INSERT ONLY)
 * 
 * This is the PRIMARY method for recording any operational change.
 * Events are never updated or deleted.
 * 
 * @param eventType - Type of operational event
 * @param eventData - Event payload data
 * @param entityRefs - Related entity IDs (lot, cage, etc.)
 * @returns Persistence result with event ID
 */
export async function persistOperationalEvent(
  eventType: string,
  eventData: Record<string, unknown>,
  entityRefs?: {
    lotId?: string;
    cageId?: string;
    breedingGroupId?: string;
    litterId?: string;
  },
  options?: {
    reason?: string;
    notes?: string;
    performedBy?: string;
    performedByName?: string;
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
  }
): Promise<PersistenceResult<OperationalEventRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    // Compute event hash for integrity
    const eventHash = await hashEvent({
      eventType,
      eventData,
      entityRefs,
      timestamp: now,
    });
    
    const record: OperationalEventRecord = {
      id: crypto.randomUUID(),
      ...context,
      event_type: eventType,
      event_category: eventType.split('_')[0],
      lot_id: entityRefs?.lotId,
      cage_id: entityRefs?.cageId,
      breeding_group_id: entityRefs?.breedingGroupId,
      litter_id: entityRefs?.litterId,
      event_data: eventData,
      previous_state: options?.previousState,
      new_state: options?.newState,
      reason: options?.reason,
      notes: options?.notes,
      metadata: {},
      performed_by: options?.performedBy,
      performed_by_name: options?.performedByName,
      occurred_at: now,
      recorded_at: now,
      is_immutable: true,
      event_hash: eventHash,
    };
    
    const { data, error } = await supabase
      .from('operational_events')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: data as OperationalEventRecord,
      eventId: data.id,
    };
  } catch (error) {
    console.error('Failed to persist operational event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get operational events for temporal queries
 * 
 * Dashboards should generally use projections instead of querying
 * raw events directly. Use this for audit trails and historical analysis.
 */
export async function queryOperationalEvents(
  filters: {
    eventType?: string;
    lotId?: string;
    cageId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }
): Promise<OperationalEventRecord[]> {
  try {
    let query = supabase
      .from('operational_events')
      .select('*')
      .order('occurred_at', { ascending: false });
    
    if (filters.eventType) {
      query = query.eq('event_type', filters.eventType);
    }
    if (filters.lotId) {
      query = query.eq('lot_id', filters.lotId);
    }
    if (filters.cageId) {
      query = query.eq('cage_id', filters.cageId);
    }
    if (filters.startTime) {
      query = query.gte('occurred_at', filters.startTime.toISOString());
    }
    if (filters.endTime) {
      query = query.lte('occurred_at', filters.endTime.toISOString());
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data as OperationalEventRecord[]) || [];
  } catch (error) {
    console.error('Failed to query operational events:', error);
    return [];
  }
}

// ============================================================================
// LOT PERSISTENCE
// ============================================================================

/**
 * Persist a lot (materialized state)
 * 
 * Lots are materialized for fast access. Changes to lots should
 * also record corresponding lot events for audit trail.
 */
export async function persistLot(lot: Partial<LotRecord>): Promise<PersistenceResult<LotRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: LotRecord = {
      id: lot.id || crypto.randomUUID(),
      workspace_id: context.workspace_id,
      instance_id: context.instance_id,
      code: lot.code!,
      species_id: lot.species_id!,
      strain: lot.strain,
      sex: lot.sex!,
      initial_quantity: lot.initial_quantity ?? 0,
      current_quantity: lot.current_quantity ?? 0,
      birth_date: toUTCString(lot.birth_date),
      acquisition_date: toUTCString(lot.acquisition_date),
      source_type: lot.source_type!,
      origin_lot_id: lot.origin_lot_id,
      supplier_name: lot.supplier_name,
      status: lot.status ?? 'active',
      location: lot.location,
      cage_id: lot.cage_id,
      generation_depth: lot.generation_depth ?? 0,
      ancestor_ids: lot.ancestor_ids ?? [],
      notes: lot.notes,
      tags: lot.tags ?? [],
      is_archived: lot.is_archived ?? false,
      created_at: lot.created_at || now,
      updated_at: now,
    };
    
    const { data, error } = await supabase
      .from('lots')
      .upsert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: data as LotRecord,
    };
  } catch (error) {
    console.error('Failed to persist lot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Record a lot lifecycle event (IMMUTABLE)
 */
export async function persistLotEvent(
  lotId: string,
  eventType: string,
  eventData: {
    quantity_affected?: number;
    reason?: string;
    metadata?: Record<string, unknown>;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  },
  options?: {
    performedBy?: string;
    performedByName?: string;
  }
): Promise<PersistenceResult<LotEventRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: LotEventRecord = {
      id: crypto.randomUUID(),
      ...context,
      lot_id: lotId,
      event_type: eventType,
      event_category: 'lot',
      quantity_affected: eventData.quantity_affected,
      previous_value: eventData.previousValue,
      new_value: eventData.newValue,
      reason: eventData.reason,
      metadata: eventData.metadata ?? {},
      performed_by: options?.performedBy,
      performed_by_name: options?.performedByName,
      occurred_at: now,
      recorded_at: now,
      is_immutable: true,
    };
    
    const { data, error } = await supabase
      .from('lot_events')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    // Also record in universal operational events
    await persistOperationalEvent(
      `lot_${eventType}`,
      { lotId, ...eventData },
      { lotId },
      {
        reason: eventData.reason,
        performedBy: options?.performedBy,
        performedByName: options?.performedByName,
        previousState: eventData.previousValue,
        newState: eventData.newValue,
      }
    );
    
    return {
      success: true,
      data: data as LotEventRecord,
      eventId: data.id,
    };
  } catch (error) {
    console.error('Failed to persist lot event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get lot lifecycle events
 */
export async function getLotLifecycleEvents(lotId: string): Promise<LotEventRecord[]> {
  try {
    const { data, error } = await supabase
      .from('lot_events')
      .select('*')
      .eq('lot_id', lotId)
      .order('occurred_at', { ascending: true });
    
    if (error) throw error;
    return (data as LotEventRecord[]) || [];
  } catch (error) {
    console.error('Failed to get lot lifecycle events:', error);
    return [];
  }
}

// ============================================================================
// CAGE PERSISTENCE
// ============================================================================

/**
 * Persist a cage (materialized state)
 */
export async function persistCage(cage: Partial<CageRecord>): Promise<PersistenceResult<CageRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: CageRecord = {
      id: cage.id || crypto.randomUUID(),
      workspace_id: context.workspace_id,
      instance_id: context.instance_id,
      code: cage.code!,
      room_id: cage.room_id,
      zone_id: cage.zone_id,
      rack_position: cage.rack_position,
      max_animals: cage.max_animals!,
      max_lots: cage.max_lots,
      volume_liters: cage.volume_liters,
      floor_area_cm2: cage.floor_area_cm2,
      species_compatibility: cage.species_compatibility,
      temperature_celsius: cage.temperature_celsius,
      humidity_percent: cage.humidity_percent,
      light_cycle: cage.light_cycle,
      status: cage.status ?? 'available',
      is_active: cage.is_active ?? true,
      last_cleaned_at: toUTCString(cage.last_cleaned_at),
      last_maintenance_at: toUTCString(cage.last_maintenance_at),
      cleaning_interval_days: cage.cleaning_interval_days,
      notes: cage.notes,
      tags: cage.tags ?? [],
      created_at: cage.created_at || now,
      updated_at: now,
    };
    
    const { data, error } = await supabase
      .from('cages')
      .upsert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: data as CageRecord,
    };
  } catch (error) {
    console.error('Failed to persist cage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Persist a cage movement (IMMUTABLE)
 */
export async function persistCageMovement(
  movement: {
    lotId: string;
    fromCageId?: string;
    toCageId?: string;
    movementType: 'initial_assignment' | 'transfer' | 'relocation' | 'removal';
    quantityMoved?: number;
    reason?: string;
    notes?: string;
    performedBy?: string;
    performedByName?: string;
  }
): Promise<PersistenceResult<CageMovementRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: CageMovementRecord = {
      id: crypto.randomUUID(),
      ...context,
      lot_id: movement.lotId,
      from_cage_id: movement.fromCageId,
      to_cage_id: movement.toCageId,
      movement_type: movement.movementType,
      quantity_moved: movement.quantityMoved,
      reason: movement.reason,
      notes: movement.notes,
      metadata: {},
      performed_by: movement.performedBy,
      performed_by_name: movement.performedByName,
      occurred_at: now,
      recorded_at: now,
      is_immutable: true,
    };
    
    const { data, error } = await supabase
      .from('cage_movements')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    // Also record in universal operational events
    await persistOperationalEvent(
      `cage_lot_${movement.movementType}`,
      { 
        lotId: movement.lotId,
        fromCageId: movement.fromCageId,
        toCageId: movement.toCageId,
        ...movement,
      },
      { lotId: movement.lotId, cageId: movement.toCageId || movement.fromCageId }
    );
    
    return {
      success: true,
      data: data as CageMovementRecord,
      eventId: data.id,
    };
  } catch (error) {
    console.error('Failed to persist cage movement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Persist lot assignment
 */
export async function persistLotAssignment(
  assignment: {
    lotId: string;
    cageId: string;
    quantityAtAssignment: number;
    notes?: string;
  }
): Promise<PersistenceResult<LotAssignmentRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: LotAssignmentRecord = {
      id: crypto.randomUUID(),
      ...context,
      lot_id: assignment.lotId,
      cage_id: assignment.cageId,
      assigned_at: now,
      quantity_at_assignment: assignment.quantityAtAssignment,
      notes: assignment.notes,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    
    const { data, error } = await supabase
      .from('lot_assignments')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: data as LotAssignmentRecord,
    };
  } catch (error) {
    console.error('Failed to persist lot assignment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// BREEDING PERSISTENCE
// ============================================================================

/**
 * Persist a breeding group
 */
export async function persistBreedingGroup(
  group: Partial<BreedingGroupRecord>
): Promise<PersistenceResult<BreedingGroupRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: BreedingGroupRecord = {
      id: group.id || crypto.randomUUID(),
      ...context,
      code: group.code!,
      sire_lot_id: group.sire_lot_id,
      dam_lot_id: group.dam_lot_id,
      dam_count: group.dam_count ?? 1,
      species_id: group.species_id!,
      strain: group.strain,
      breeding_protocol: group.breeding_protocol,
      target_offspring_count: group.target_offspring_count,
      status: group.status ?? 'active',
      cage_id: group.cage_id,
      started_at: group.started_at || now,
      completed_at: toUTCString(group.completed_at),
      total_litters_born: group.total_litters_born ?? 0,
      total_offspring_born: group.total_offspring_born ?? 0,
      successful_weanings: group.successful_weanings ?? 0,
      notes: group.notes,
      tags: group.tags ?? [],
      created_at: group.created_at || now,
      updated_at: now,
    };
    
    const { data, error } = await supabase
      .from('breeding_groups')
      .upsert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: data as BreedingGroupRecord,
    };
  } catch (error) {
    console.error('Failed to persist breeding group:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Persist a litter record
 */
export async function persistLitter(
  litter: Partial<LitterRecord>
): Promise<PersistenceResult<LitterRecord>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date().toISOString();
    
    const record: LitterRecord = {
      id: litter.id || crypto.randomUUID(),
      ...context,
      breeding_group_id: litter.breeding_group_id!,
      sire_lot_id: litter.sire_lot_id,
      dam_lot_id: litter.dam_lot_id!,
      born_count: litter.born_count!,
      live_births: litter.live_births!,
      stillbirths: litter.stillbirths ?? 0,
      weaned_count: litter.weaned_count ?? 0,
      birth_date: toUTCString(litter.birth_date) || now,
      weaning_date: toUTCString(litter.weaning_date),
      offspring_lot_id: litter.offspring_lot_id,
      viability_notes: litter.viability_notes,
      anomalies_detected: litter.anomalies_detected,
      notes: litter.notes,
      created_at: litter.created_at || now,
      updated_at: now,
    };
    
    const { data, error } = await supabase
      .from('litters')
      .insert(record)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: data as LitterRecord,
    };
  } catch (error) {
    console.error('Failed to persist litter:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// PROJECTION REBUILD SERVICES
// ============================================================================

/**
 * Rebuild current lot state projection
 * 
 * Called after lot events to keep projections in sync.
 */
export async function rebuildLotStateProjection(
  lotId: string
): Promise<PersistenceResult<CurrentLotStateProjection>> {
  try {
    // Get current lot data
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();
    
    if (lotError) throw lotError;
    if (!lot) return { success: false, error: 'Lot not found' };
    
    // Get lot statistics from events
    const { data: events } = await supabase
      .from('lot_events')
      .select('event_type, quantity_affected, occurred_at')
      .eq('lot_id', lotId)
      .order('occurred_at', { ascending: true });
    
    // Calculate statistics
    let totalMortality = 0;
    let totalAdditions = 0;
    let subdivisionCount = 0;
    let lastEventAt: string | undefined;
    let lastEventType: string | undefined;
    
    if (events) {
      for (const event of events) {
        if (event.event_type.includes('mortality')) {
          totalMortality += event.quantity_affected || 0;
        }
        if (event.event_type.includes('animals_added')) {
          totalAdditions += event.quantity_affected || 0;
        }
        if (event.event_type.includes('subdivided')) {
          subdivisionCount++;
        }
        lastEventAt = event.occurred_at;
        lastEventType = event.event_type;
      }
    }
    
    // Get cage info if assigned
    let cageCode: string | undefined;
    if (lot.cage_id) {
      const { data: cage } = await supabase
        .from('cages')
        .select('code')
        .eq('id', lot.cage_id)
        .single();
      cageCode = cage?.code;
    }
    
    // Count descendants
    const { count: descendantCount } = await supabase
      .from('lots')
      .select('*', { count: 'exact', head: true })
      .contains('ancestor_ids', [lotId]);
    
    const projection: CurrentLotStateProjection = {
      id: crypto.randomUUID(),
      workspace_id: lot.workspace_id,
      instance_id: lot.instance_id,
      lot_id: lot.id,
      code: lot.code,
      species_id: lot.species_id,
      strain: lot.strain,
      sex: lot.sex,
      current_quantity: lot.current_quantity,
      status: lot.status,
      location: lot.location,
      cage_id: lot.cage_id,
      cage_code: cageCode,
      generation_depth: lot.generation_depth,
      ancestor_count: lot.ancestor_ids.length,
      descendant_count: descendantCount || 0,
      total_mortality: totalMortality,
      total_additions: totalAdditions,
      subdivision_count: subdivisionCount,
      last_event_at: lastEventAt,
      last_event_type: lastEventType,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('current_lot_state')
      .upsert(projection)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: result as CurrentLotStateProjection,
    };
  } catch (error) {
    console.error('Failed to rebuild lot state projection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rebuild cage occupancy projection
 */
export async function rebuildCageOccupancyProjection(
  cageId: string
): Promise<PersistenceResult<CurrentCageOccupancyProjection>> {
  try {
    // Get cage data
    const { data: cage, error: cageError } = await supabase
      .from('cages')
      .select('*')
      .eq('id', cageId)
      .single();
    
    if (cageError) throw cageError;
    if (!cage) return { success: false, error: 'Cage not found' };
    
    // Get active assignments
    const { data: assignments } = await supabase
      .from('lot_assignments')
      .select('lot_id, quantity_at_assignment')
      .eq('cage_id', cageId)
      .eq('is_active', true);
    
    const assignedLotIds = assignments?.map(a => a.lot_id) || [];
    let totalAnimals = 0;
    const lotCodes: string[] = [];
    const speciesIds: string[] = [];
    
    // Get current quantities from lots
    if (assignedLotIds.length > 0) {
      const { data: lots } = await supabase
        .from('lots')
        .select('id, code, species_id, current_quantity')
        .in('id', assignedLotIds);
      
      if (lots) {
        for (const lot of lots) {
          totalAnimals += lot.current_quantity;
          lotCodes.push(lot.code);
          if (!speciesIds.includes(lot.species_id)) {
            speciesIds.push(lot.species_id);
          }
        }
      }
    }
    
    const utilizationPercent = cage.max_animals > 0
      ? (totalAnimals / cage.max_animals) * 100
      : 0;
    
    const projection: CurrentCageOccupancyProjection = {
      id: crypto.randomUUID(),
      workspace_id: cage.workspace_id,
      instance_id: cage.instance_id,
      cage_id: cage.id,
      cage_code: cage.code,
      room_id: cage.room_id,
      zone_id: cage.zone_id,
      rack_position: cage.rack_position,
      status: cage.status,
      total_animals: totalAnimals,
      total_lots: assignedLotIds.length,
      utilization_percent: parseFloat(utilizationPercent.toFixed(2)),
      is_over_capacity: totalAnimals > cage.max_animals,
      assigned_lot_ids: assignedLotIds,
      assigned_lot_codes: lotCodes,
      species_ids: speciesIds,
      max_animals: cage.max_animals,
      remaining_capacity: Math.max(0, cage.max_animals - totalAnimals),
      last_cleaned_at: cage.last_cleaned_at,
      computed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    const { data: result, error } = await supabase
      .from('current_cage_occupancy')
      .upsert(projection)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: result as CurrentCageOccupancyProjection,
    };
  } catch (error) {
    console.error('Failed to rebuild cage occupancy projection:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rebuild all projections (full system rebuild)
 * 
 * Use sparingly - typically only needed after migration or data recovery.
 */
export async function rebuildAllProjections(): Promise<{
  lotsRebuilt: number;
  cagesRebuilt: number;
  breedingGroupsRebuilt: number;
}> {
  const context = getCurrentWorkspaceContext();
  
  // Rebuild all lot states
  const { data: lots } = await supabase
    .from('lots')
    .select('id')
    .eq('workspace_id', context.workspace_id);
  
  let lotsRebuilt = 0;
  for (const lot of lots || []) {
    const result = await rebuildLotStateProjection(lot.id);
    if (result.success) lotsRebuilt++;
  }
  
  // Rebuild all cage occupancies
  const { data: cages } = await supabase
    .from('cages')
    .select('id')
    .eq('workspace_id', context.workspace_id);
  
  let cagesRebuilt = 0;
  for (const cage of cages || []) {
    const result = await rebuildCageOccupancyProjection(cage.id);
    if (result.success) cagesRebuilt++;
  }
  
  return {
    lotsRebuilt,
    cagesRebuilt,
    breedingGroupsRebuilt: 0,
  };
}

// ============================================================================
// DASHBOARD SNAPSHOT SERVICE
// ============================================================================

/**
 * Generate operational dashboard snapshot
 * 
 * This creates a point-in-time snapshot of key operational metrics.
 * Dashboards should read from this snapshot rather than computing
 * aggregations on every render.
 */
export async function generateDashboardSnapshot(): Promise<PersistenceResult<OperationalDashboardSnapshot>> {
  try {
    const context = getCurrentWorkspaceContext();
    const now = new Date();
    const nowStr = now.toISOString();
    
    // Get inventory summary
    const { data: lotsStats } = await supabase
      .from('lots')
      .select('status, species_id, current_quantity')
      .eq('workspace_id', context.workspace_id)
      .eq('is_archived', false);
    
    const totalLots = lotsStats?.length || 0;
    const activeLots = lotsStats?.filter(l => l.status === 'active').length || 0;
    const totalAnimals = lotsStats?.reduce((sum, l) => sum + (l.current_quantity || 0), 0) || 0;
    
    const animalsBySpecies: Record<string, number> = {};
    const animalsByStatus: Record<string, number> = {};
    
    for (const lot of lotsStats || []) {
      animalsBySpecies[lot.species_id] = (animalsBySpecies[lot.species_id] || 0) + (lot.current_quantity || 0);
      animalsByStatus[lot.status] = (animalsByStatus[lot.status] || 0) + (lot.current_quantity || 0);
    }
    
    // Get cage summary
    const { data: cages } = await supabase
      .from('cages')
      .select('status')
      .eq('workspace_id', context.workspace_id)
      .eq('is_active', true);
    
    const totalCages = cages?.length || 0;
    const availableCages = cages?.filter(c => c.status === 'available').length || 0;
    const occupiedCages = cages?.filter(c => c.status === 'occupied').length || 0;
    const cleaningCages = cages?.filter(c => c.status === 'cleaning').length || 0;
    
    // Get breeding summary
    const { data: breedingGroups } = await supabase
      .from('breeding_groups')
      .select('status')
      .eq('workspace_id', context.workspace_id)
      .eq('status', 'active');
    
    const activeBreedingGroups = breedingGroups?.length || 0;
    
    // Get recent activity
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    
    const { count: eventsLast24h } = await supabase
      .from('operational_events')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', context.workspace_id)
      .gte('occurred_at', twentyFourHoursAgo);
    
    const { count: movementsLast24h } = await supabase
      .from('cage_movements')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', context.workspace_id)
      .gte('occurred_at', twentyFourHoursAgo);
    
    const snapshot: OperationalDashboardSnapshot = {
      id: crypto.randomUUID(),
      ...context,
      snapshot_at: nowStr,
      total_lots: totalLots,
      active_lots: activeLots,
      total_animals: totalAnimals,
      animals_by_species: animalsBySpecies,
      animals_by_status: animalsByStatus,
      total_cages: totalCages,
      available_cages: availableCages,
      occupied_cages: occupiedCages,
      cleaning_cages: cleaningCages,
      average_utilization_percent: 0,  // Would need calculation from occupancy projections
      active_breeding_groups: activeBreedingGroups,
      total_litters_this_month: 0,  // Would need query
      total_offspring_this_month: 0,
      weaning_success_rate_percent: 0,
      mortality_today: 0,  // Would need query
      mortality_this_week: 0,
      mortality_this_month: 0,
      critical_alerts: 0,
      warning_alerts: 0,
      events_last_24h: eventsLast24h || 0,
      movements_last_24h: movementsLast24h || 0,
      created_at: nowStr,
    };
    
    // Upsert (replace existing snapshot for this workspace/instance)
    const { data: result, error } = await supabase
      .from('operational_dashboard_snapshot')
      .upsert(snapshot)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      data: result as OperationalDashboardSnapshot,
    };
  } catch (error) {
    console.error('Failed to generate dashboard snapshot:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Export all services
export default {
  persistOperationalEvent,
  queryOperationalEvents,
  persistLot,
  persistLotEvent,
  getLotLifecycleEvents,
  persistCage,
  persistCageMovement,
  persistLotAssignment,
  persistBreedingGroup,
  persistLitter,
  rebuildLotStateProjection,
  rebuildCageOccupancyProjection,
  rebuildAllProjections,
  generateDashboardSnapshot,
};
