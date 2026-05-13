/**
 * Bioterio Operational Integration Validation Layer
 * 
 * CRITICAL OBJECTIVE:
 * Validate and stabilize the FULL operational chain end-to-end.
 * 
 * This module provides:
 * 1. End-to-end operational validation flows
 * 2. Projection reconciliation utilities
 * 3. Operational integrity checks
 * 4. Debug tooling for operational timeline inspection
 * 
 * DESIGN PRINCIPLES:
 * - Projections must be derivable from event history
 * - Event-driven integrity must be maintained
 * - Synchronization between workflows, events, and projections is critical
 * - Detection of drift, inconsistencies, and orphan records
 */

import { supabase } from '@/integrations/supabase/client';
import type { OperationalEventRecord, CurrentLotStateProjection, CurrentCageOccupancyProjection } from '../persistence/types';
import type { LotStatus } from '../lots/runtime/types';
import type { EventType, EventCategory } from '../events/runtime/types';

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export interface ValidationResult {
  success: boolean;
  validationType: string;
  entityId?: string;
  entityType?: 'lot' | 'cage' | 'breeding_group' | 'projection';
  timestamp: Date;
  errors: ValidationErrorDetail[];
  warnings: ValidationWarningDetail[];
  info: string[];
}

export interface ValidationErrorDetail {
  code: string;
  message: string;
  severity: 'error' | 'critical';
  field?: string;
  expected?: unknown;
  actual?: unknown;
  repairable: boolean;
  repairAction?: string;
}

export interface ValidationWarningDetail {
  code: string;
  message: string;
  severity: 'warning';
  field?: string;
  recommendation?: string;
}

export interface ReconciliationReport {
  entityType: 'lot' | 'cage';
  entityId: string;
  projectionExists: boolean;
  eventsFound: number;
  discrepancies: DiscrepancyDetail[];
  canRebuild: boolean;
  rebuildRecommended: boolean;
  lastProjectionUpdate?: Date;
  lastEventTimestamp?: Date;
}

export interface DiscrepancyDetail {
  type: 'quantity_mismatch' | 'status_mismatch' | 'missing_projection' | 'stale_projection' | 'orphan_event';
  description: string;
  projectedValue?: unknown;
  computedValue?: unknown;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface OperationalTimelineEntry {
  eventId: string;
  eventType: EventType;
  category: EventCategory;
  timestamp: Date;
  entityId?: string;
  entityType?: 'lot' | 'cage';
  metadata: Record<string, unknown>;
  actor?: string;
  relatedEvents: string[];
}

export interface WorkflowExecutionTrace {
  workflowName: string;
  executionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
  steps: WorkflowStepTrace[];
  eventsGenerated: string[];
  projectionsUpdated: string[];
  errors: string[];
}

export interface WorkflowStepTrace {
  stepName: string;
  status: 'pending' | 'completed' | 'failed';
  duration?: number; // ms
  result?: unknown;
  error?: string;
}

// ============================================================================
// END-TO-END OPERATIONAL VALIDATION FLOWS
// ============================================================================

/**
 * Validate complete operational chain for a lot:
 * Workflow → Operational Event → Persistence → Projection Update → Dashboard Refresh
 */
export async function validateLotOperationalChain(
  lotId: string,
  options?: {
    includeEvents?: boolean;
    includeProjection?: boolean;
    includeDashboard?: boolean;
  }
): Promise<ValidationResult> {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationWarningDetail[] = [];
  const info: string[] = [];
  
  const opts = {
    includeEvents: true,
    includeProjection: true,
    includeDashboard: false,
    ...options,
  };

  try {
    // 1. Verify lot exists in persistence
    const { data: lot, error: lotError } = await supabase
      .from('lots')
      .select('*')
      .eq('id', lotId)
      .single();

    if (lotError || !lot) {
      errors.push({
        code: 'LOT_NOT_FOUND',
        message: `Lot ${lotId} not found in persistence layer`,
        severity: 'critical',
        repairable: false,
      });
      return {
        success: false,
        validationType: 'lot_operational_chain',
        entityId: lotId,
        entityType: 'lot',
        timestamp: new Date(),
        errors,
        warnings,
        info,
      };
    }

    info.push(`✓ Lot found in persistence`);

    // 2. Verify operational events exist for this lot
    if (opts.includeEvents) {
      const { data: events } = await supabase
        .from('operational_events')
        .select('*')
        .eq('lot_id', lotId)
        .order('occurred_at', { ascending: true });

      if (!events || events.length === 0) {
        warnings.push({
          code: 'NO_OPERATIONAL_EVENTS',
          message: `No operational events found for lot ${lotId}`,
          severity: 'warning',
          recommendation: 'Consider rebuilding event history or verify event generation in workflows',
        });
      } else {
        info.push(`✓ Found ${events.length} operational events for lot`);
        
        // Verify first event is lot_created
        const firstEvent = events[0];
        if (!firstEvent.event_type.includes('lot_created')) {
          warnings.push({
            code: 'MISSING_CREATION_EVENT',
            message: 'First event is not lot_created',
            severity: 'warning',
            recommendation: 'Verify lot creation workflow generates proper events',
          });
        }
      }

      // Check for event ordering issues
      const eventOrderIssues = checkEventOrdering(events || []);
      if (eventOrderIssues.length > 0) {
        warnings.push(...eventOrderIssues);
      }
    }

    // 3. Verify projection exists and is consistent
    if (opts.includeProjection) {
      const { data: projection } = await supabase
        .from('current_lot_state')
        .select('*')
        .eq('lot_id', lotId)
        .single();

      if (!projection) {
        errors.push({
          code: 'MISSING_PROJECTION',
          message: `Projection missing for lot ${lotId}`,
          severity: 'error',
          repairable: true,
          repairAction: 'rebuild_projection',
        });
      } else {
        info.push(`✓ Projection exists for lot`);
        
        // Verify projection consistency with source lot
        const projectionDiscrepancies = verifyLotProjectionConsistency(lot, projection);
        if (projectionDiscrepancies.length > 0) {
          errors.push(...projectionDiscrepancies.map(d => ({
            code: 'PROJECTION_MISMATCH',
            message: d.description,
            severity: d.severity === 'critical' ? 'critical' : 'error' as const,
            expected: d.computedValue,
            actual: d.projectedValue,
            repairable: true,
            repairAction: 'rebuild_projection',
          })));
        } else {
          info.push(`✓ Projection consistent with source data`);
        }

        // Check projection staleness
        const projectionAge = Date.now() - new Date(projection.updated_at).getTime();
        if (projectionAge > 5 * 60 * 1000) { // 5 minutes
          warnings.push({
            code: 'STALE_PROJECTION',
            message: `Projection is ${Math.round(projectionAge / 1000)}s old`,
            severity: 'warning',
            recommendation: 'Consider triggering projection refresh',
          });
        }
      }
    }

    // 4. Verify cage assignment consistency (if assigned)
    if (lot.cage_id) {
      const { data: cage } = await supabase
        .from('cages')
        .select('id')
        .eq('id', lot.cage_id)
        .single();

      if (!cage) {
        errors.push({
          code: 'ORPHAN_CAGE_REFERENCE',
          message: `Lot references non-existent cage ${lot.cage_id}`,
          severity: 'critical',
          repairable: false,
        });
      } else {
        info.push(`✓ Cage assignment valid`);
        
        // Verify lot appears in cage occupancy projection
        const { data: cageProjection } = await supabase
          .from('current_cage_occupancy')
          .select('assigned_lot_ids')
          .eq('cage_id', lot.cage_id)
          .single();

        if (cageProjection && !cageProjection.assigned_lot_ids?.includes(lotId)) {
          errors.push({
            code: 'CAGE_PROJECTION_INCONSISTENCY',
            message: 'Lot not listed in cage occupancy projection',
            severity: 'error',
            expected: lotId,
            actual: cageProjection.assigned_lot_ids,
            repairable: true,
            repairAction: 'rebuild_cage_projection',
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      validationType: 'lot_operational_chain',
      entityId: lotId,
      entityType: 'lot',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      severity: 'critical',
      repairable: false,
    });
    
    return {
      success: false,
      validationType: 'lot_operational_chain',
      entityId: lotId,
      entityType: 'lot',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  }
}

/**
 * Validate cage operational chain:
 * Movements → Assignments → Occupancy Projection → Dashboard Updates
 */
export async function validateCageOperationalChain(
  cageId: string,
  options?: {
    includeMovements?: boolean;
    includeAssignments?: boolean;
    includeProjection?: boolean;
  }
): Promise<ValidationResult> {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationWarningDetail[] = [];
  const info: string[] = [];

  const opts = {
    includeMovements: true,
    includeAssignments: true,
    includeProjection: true,
    ...options,
  };

  try {
    // 1. Verify cage exists
    const { data: cage, error: cageError } = await supabase
      .from('cages')
      .select('*')
      .eq('id', cageId)
      .single();

    if (cageError || !cage) {
      errors.push({
        code: 'CAGE_NOT_FOUND',
        message: `Cage ${cageId} not found in persistence`,
        severity: 'critical',
        repairable: false,
      });
      return {
        success: false,
        validationType: 'cage_operational_chain',
        entityId: cageId,
        entityType: 'cage',
        timestamp: new Date(),
        errors,
        warnings,
        info,
      };
    }

    info.push(`✓ Cage found in persistence`);

    // 2. Verify movements
    if (opts.includeMovements) {
      const { data: movements } = await supabase
        .from('cage_movements')
        .select('*')
        .eq('to_cage_id', cageId)
        .order('occurred_at', { ascending: true });

      if (movements && movements.length > 0) {
        info.push(`✓ Found ${movements.length} movement records to this cage`);
        
        // Check for movements without corresponding assignments
        const { data: assignments } = await supabase
          .from('lot_assignments')
          .select('lot_id')
          .eq('cage_id', cageId)
          .eq('is_active', true);

        const activeLotIds = new Set(assignments?.map(a => a.lot_id) || []);
        
        for (const movement of movements) {
          if (movement.movement_type === 'initial_assignment' || movement.movement_type === 'transfer') {
            if (!activeLotIds.has(movement.lot_id)) {
              warnings.push({
                code: 'MOVEMENT_WITHOUT_ASSIGNMENT',
                message: `Movement for lot has no active assignment`,
                severity: 'warning',
                recommendation: 'Verify lot assignment state or mark movement as removal',
              });
            }
          }
        }
      }
    }

    // 3. Verify occupancy projection
    if (opts.includeProjection) {
      const { data: projection } = await supabase
        .from('current_cage_occupancy')
        .select('*')
        .eq('cage_id', cageId)
        .single();

      if (!projection) {
        errors.push({
          code: 'MISSING_OCCUPANCY_PROJECTION',
          message: `Occupancy projection missing for cage ${cageId}`,
          severity: 'error',
          repairable: true,
          repairAction: 'rebuild_cage_projection',
        });
      } else {
        info.push(`✓ Occupancy projection exists`);
        
        // Verify projection consistency
        const discrepancies = verifyCageProjectionConsistency(cage, projection);
        if (discrepancies.length > 0) {
          errors.push(...discrepancies.map(d => ({
            code: 'OCCUPANCY_PROJECTION_MISMATCH',
            message: d.description,
            severity: d.severity === 'critical' ? 'critical' : 'error' as const,
            expected: d.computedValue,
            actual: d.projectedValue,
            repairable: true,
            repairAction: 'rebuild_cage_projection',
          })));
        } else {
          info.push(`✓ Occupancy projection consistent`);
        }

        // Check for overcapacity
        if (projection.is_over_capacity) {
          warnings.push({
            code: 'OVER_CAPACITY',
            message: `Cage is over capacity: ${projection.total_animals}/${projection.max_animals}`,
            severity: 'warning',
            recommendation: 'Review lot assignments and consider relocation',
          });
        }
      }
    }

    return {
      success: errors.length === 0,
      validationType: 'cage_operational_chain',
      entityId: cageId,
      entityType: 'cage',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      severity: 'critical',
      repairable: false,
    });
    
    return {
      success: false,
      validationType: 'cage_operational_chain',
      entityId: cageId,
      entityType: 'cage',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  }
}

// ============================================================================
// PROJECTION RECONCILIATION UTILITIES
// ============================================================================

/**
 * Verify lot projection consistency with source data
 */
function verifyLotProjectionConsistency(
  lot: any,
  projection: CurrentLotStateProjection
): DiscrepancyDetail[] {
  const discrepancies: DiscrepancyDetail[] = [];

  // Check current quantity
  if (lot.current_quantity !== projection.current_quantity) {
    discrepancies.push({
      type: 'quantity_mismatch',
      description: `Quantity mismatch: projection=${projection.current_quantity}, source=${lot.current_quantity}`,
      projectedValue: projection.current_quantity,
      computedValue: lot.current_quantity,
      severity: 'high',
    });
  }

  // Check status
  if (lot.status !== projection.status) {
    discrepancies.push({
      type: 'status_mismatch',
      description: `Status mismatch: projection=${projection.status}, source=${lot.status}`,
      projectedValue: projection.status,
      computedValue: lot.status,
      severity: 'medium',
    });
  }

  // Check cage assignment
  if (lot.cage_id !== projection.cage_id) {
    discrepancies.push({
      type: 'location_mismatch',
      description: `Cage assignment mismatch`,
      projectedValue: projection.cage_id,
      computedValue: lot.cage_id,
      severity: 'medium',
    });
  }

  return discrepancies;
}

/**
 * Verify cage projection consistency with source data
 */
function verifyCageProjectionConsistency(
  cage: any,
  projection: CurrentCageOccupancyProjection
): DiscrepancyDetail[] {
  const discrepancies: DiscrepancyDetail[] = [];

  // Check status
  if (cage.status !== projection.status) {
    discrepancies.push({
      type: 'status_mismatch',
      description: `Status mismatch: projection=${projection.status}, source=${cage.status}`,
      projectedValue: projection.status,
      computedValue: cage.status,
      severity: 'medium',
    });
  }

  // Check max capacity
  if (cage.max_animals !== projection.max_animals) {
    discrepancies.push({
      type: 'capacity_mismatch',
      description: `Max capacity mismatch`,
      projectedValue: projection.max_animals,
      computedValue: cage.max_animals,
      severity: 'low',
    });
  }

  return discrepancies;
}

/**
 * Rebuild projection from event history
 */
export async function rebuildProjectionFromEvents(
  entityType: 'lot' | 'cage',
  entityId: string
): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    entityType,
    entityId,
    projectionExists: false,
    eventsFound: 0,
    discrepancies: [],
    canRebuild: true,
    rebuildRecommended: false,
  };

  try {
    if (entityType === 'lot') {
      // Get all events for this lot
      const { data: events } = await supabase
        .from('lot_events')
        .select('*')
        .eq('lot_id', entityId)
        .order('occurred_at', { ascending: true });

      report.eventsFound = events?.length || 0;
      report.lastEventTimestamp = events?.[events.length - 1]?.occurred_at 
        ? new Date(events[events.length - 1].occurred_at) 
        : undefined;

      // Get current projection
      const { data: projection } = await supabase
        .from('current_lot_state')
        .select('*')
        .eq('lot_id', entityId)
        .single();

      report.projectionExists = !!projection;
      
      if (projection) {
        report.lastProjectionUpdate = new Date(projection.updated_at);
        
        // Compute expected state from events
        const computedState = computeLotStateFromEvents(events || []);
        
        // Compare with projection
        if (computedState.currentQuantity !== projection.current_quantity) {
          report.discrepancies.push({
            type: 'quantity_mismatch',
            description: 'Quantity computed from events differs from projection',
            projectedValue: projection.current_quantity,
            computedValue: computedState.currentQuantity,
            severity: 'high',
          });
          report.rebuildRecommended = true;
        }

        if (computedState.status !== projection.status) {
          report.discrepancies.push({
            type: 'status_mismatch',
            description: 'Status computed from events differs from projection',
            projectedValue: projection.status,
            computedValue: computedState.status,
            severity: 'medium',
          });
          report.rebuildRecommended = true;
        }
      } else {
        report.rebuildRecommended = true;
      }
    } else if (entityType === 'cage') {
      // Get all movements for this cage
      const { data: movements } = await supabase
        .from('cage_movements')
        .select('*')
        .eq('to_cage_id', entityId)
        .order('occurred_at', { ascending: true });

      report.eventsFound = movements?.length || 0;

      // Get current projection
      const { data: projection } = await supabase
        .from('current_cage_occupancy')
        .select('*')
        .eq('cage_id', entityId)
        .single();

      report.projectionExists = !!projection;

      if (projection) {
        report.lastProjectionUpdate = new Date(projection.updated_at);
        
        // Compute expected occupancy from movements and assignments
        const computedOccupancy = await computeCageOccupancyFromEvents(entityId, movements || []);
        
        if (computedOccupancy.totalAnimals !== projection.total_animals) {
          report.discrepancies.push({
            type: 'quantity_mismatch',
            description: 'Total animals computed from events differs from projection',
            projectedValue: projection.total_animals,
            computedValue: computedOccupancy.totalAnimals,
            severity: 'high',
          });
          report.rebuildRecommended = true;
        }
      } else {
        report.rebuildRecommended = true;
      }
    }

    return report;
  } catch (error) {
    report.discrepancies.push({
      type: 'orphan_event',
      description: `Error during reconciliation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      severity: 'critical',
    });
    report.canRebuild = false;
    return report;
  }
}

/**
 * Compute lot state from event history
 */
function computeLotStateFromEvents(events: any[]): {
  currentQuantity: number;
  status: LotStatus;
  totalMortality: number;
  subdivisionCount: number;
} {
  let currentQuantity = 0;
  let status: LotStatus = 'active';
  let totalMortality = 0;
  let subdivisionCount = 0;

  // Find initial quantity from creation event
  const creationEvent = events.find(e => e.event_type === 'created');
  if (creationEvent) {
    currentQuantity = creationEvent.new_value?.current_quantity || 0;
  }

  for (const event of events) {
    switch (event.event_type) {
      case 'animals_added':
        currentQuantity += event.quantity_affected || 0;
        break;
      case 'mortality':
        const mortality = event.quantity_affected || 0;
        currentQuantity -= mortality;
        totalMortality += mortality;
        break;
      case 'subdivided':
        subdivisionCount++;
        status = 'subdivided';
        break;
      case 'sold':
        status = 'sold';
        break;
      case 'retired':
        status = 'retired';
        break;
      case 'deceased':
        status = 'deceased';
        break;
    }
  }

  // Ensure non-negative quantity
  currentQuantity = Math.max(0, currentQuantity);

  return {
    currentQuantity,
    status,
    totalMortality,
    subdivisionCount,
  };
}

/**
 * Compute cage occupancy from movement events
 */
async function computeCageOccupancyFromEvents(
  cageId: string,
  movements: any[]
): Promise<{ totalAnimals: number; totalLots: number }> {
  // Get active assignments
  const { data: assignments } = await supabase
    .from('lot_assignments')
    .select('lot_id')
    .eq('cage_id', cageId)
    .eq('is_active', true);

  const activeLotIds = assignments?.map(a => a.lot_id) || [];
  
  if (activeLotIds.length === 0) {
    return { totalAnimals: 0, totalLots: 0 };
  }

  // Get current quantities for assigned lots
  const { data: lots } = await supabase
    .from('lots')
    .select('current_quantity')
    .in('id', activeLotIds);

  const totalAnimals = lots?.reduce((sum, lot) => sum + (lot.current_quantity || 0), 0) || 0;

  return {
    totalAnimals,
    totalLots: activeLotIds.length,
  };
}

// ============================================================================
// OPERATIONAL INTEGRITY CHECKS
// ============================================================================

/**
 * Check for event ordering issues
 */
function checkEventOrdering(events: OperationalEventRecord[]): ValidationWarningDetail[] {
  const warnings: ValidationWarningDetail[] = [];

  for (let i = 1; i < events.length; i++) {
    const prevEvent = events[i - 1];
    const currEvent = events[i];

    // Check timestamp ordering
    if (new Date(prevEvent.occurred_at) > new Date(currEvent.occurred_at)) {
      warnings.push({
        code: 'EVENT_ORDERING_ISSUE',
        message: `Event ordering issue: ${prevEvent.event_type} occurred after ${currEvent.event_type}`,
        severity: 'warning',
        recommendation: 'Verify event timestamps and consider reordering',
      });
    }
  }

  return warnings;
}

/**
 * Detect negative quantities across all lots
 */
export async function detectNegativeQuantities(): Promise<ValidationResult> {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationWarningDetail[] = [];
  const info: string[] = [];

  try {
    const { data: lots } = await supabase
      .from('lots')
      .select('id, code, current_quantity, initial_quantity')
      .lt('current_quantity', 0);

    if (lots && lots.length > 0) {
      for (const lot of lots) {
        errors.push({
          code: 'NEGATIVE_QUANTITY',
          message: `Lot ${lot.code} has negative quantity: ${lot.current_quantity}`,
          severity: 'critical',
          field: 'current_quantity',
          expected: '>= 0',
          actual: lot.current_quantity,
          repairable: true,
          repairAction: 'set_quantity_to_zero_and_investigate',
        });
      }
    } else {
      info.push('✓ No negative quantities detected');
    }

    return {
      success: errors.length === 0,
      validationType: 'negative_quantity_check',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'critical',
      repairable: false,
    });
    
    return {
      success: false,
      validationType: 'negative_quantity_check',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  }
}

/**
 * Detect invalid subdivision totals (children exceed parent)
 */
export async function detectInvalidSubdivisionTotals(): Promise<ValidationResult> {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationWarningDetail[] = [];
  const info: string[] = [];

  try {
    // Get all subdivided lots
    const { data: parentLots } = await supabase
      .from('lots')
      .select('id, initial_quantity, status')
      .eq('status', 'subdivided');

    if (!parentLots || parentLots.length === 0) {
      info.push('✓ No subdivided lots to validate');
      return {
        success: true,
        validationType: 'subdivision_validation',
        timestamp: new Date(),
        errors,
        warnings,
        info,
      };
    }

    for (const parent of parentLots) {
      // Get child lots
      const { data: children } = await supabase
        .from('lots')
        .select('id, initial_quantity')
        .contains('ancestor_ids', [parent.id]);

      if (children && children.length > 0) {
        const totalChildrenQuantity = children.reduce(
          (sum, child) => sum + (child.initial_quantity || 0),
          0
        );

        if (totalChildrenQuantity > parent.initial_quantity) {
          errors.push({
            code: 'INVALID_SUBDIVISION_TOTAL',
            message: `Children of lot exceed parent quantity`,
            severity: 'critical',
            field: 'initial_quantity',
            expected: `<= ${parent.initial_quantity}`,
            actual: totalChildrenQuantity,
            repairable: false,
          });
        }
      }
    }

    if (errors.length === 0) {
      info.push('✓ All subdivision totals are valid');
    }

    return {
      success: errors.length === 0,
      validationType: 'subdivision_validation',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'critical',
      repairable: false,
    });
    
    return {
      success: false,
      validationType: 'subdivision_validation',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  }
}

/**
 * Detect orphan movement records
 */
export async function detectOrphanMovementRecords(): Promise<ValidationResult> {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationWarningDetail[] = [];
  const info: string[] = [];

  try {
    // Get all cage movements
    const { data: movements } = await supabase
      .from('cage_movements')
      .select('lot_id, from_cage_id, to_cage_id');

    if (!movements || movements.length === 0) {
      info.push('✓ No movement records to validate');
      return {
        success: true,
        validationType: 'orphan_movement_check',
        timestamp: new Date(),
        errors,
        warnings,
        info,
      };
    }

    const lotIds = new Set(movements.flatMap(m => [m.lot_id].filter(Boolean) as string[]));
    
    // Verify all referenced lots exist
    const { data: lots } = await supabase
      .from('lots')
      .select('id')
      .in('id', Array.from(lotIds));

    const existingLotIds = new Set(lots?.map(l => l.id) || []);

    for (const movement of movements) {
      if (!existingLotIds.has(movement.lot_id)) {
        errors.push({
          code: 'ORPHAN_MOVEMENT_RECORD',
          message: `Movement references non-existent lot`,
          severity: 'critical',
          repairable: false,
        });
      }

      if (movement.from_cage_id) {
        const { data: fromCage } = await supabase
          .from('cages')
          .select('id')
          .eq('id', movement.from_cage_id)
          .single();
        
        if (!fromCage) {
          errors.push({
            code: 'ORPHAN_MOVEMENT_FROM_CAGE',
            message: `Movement references non-existent from_cage`,
            severity: 'error',
            repairable: false,
          });
        }
      }

      if (movement.to_cage_id) {
        const { data: toCage } = await supabase
          .from('cages')
          .select('id')
          .eq('id', movement.to_cage_id)
          .single();
        
        if (!toCage) {
          errors.push({
            code: 'ORPHAN_MOVEMENT_TO_CAGE',
            message: `Movement references non-existent to_cage`,
            severity: 'error',
            repairable: false,
          });
        }
      }
    }

    if (errors.length === 0) {
      info.push('✓ No orphan movement records detected');
    }

    return {
      success: errors.length === 0,
      validationType: 'orphan_movement_check',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'critical',
      repairable: false,
    });
    
    return {
      success: false,
      validationType: 'orphan_movement_check',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  }
}

/**
 * Detect invalid lineage references
 */
export async function detectInvalidLineageReferences(): Promise<ValidationResult> {
  const errors: ValidationErrorDetail[] = [];
  const warnings: ValidationWarningDetail[] = [];
  const info: string[] = [];

  try {
    // Get all lots with origin_lot_id
    const { data: lots } = await supabase
      .from('lots')
      .select('id, code, origin_lot_id');

    if (!lots || lots.length === 0) {
      info.push('✓ No lineage references to validate');
      return {
        success: true,
        validationType: 'lineage_validation',
        timestamp: new Date(),
        errors,
        warnings,
        info,
      };
    }

    const lotsWithOrigin = lots.filter(l => l.origin_lot_id);
    const originLotIds = new Set(lotsWithOrigin.map(l => l.origin_lot_id!) as string[]);

    // Verify all origin lots exist
    const { data: originLots } = await supabase
      .from('lots')
      .select('id')
      .in('id', Array.from(originLotIds));

    const existingOriginIds = new Set(originLots?.map(l => l.id) || []);

    for (const lot of lotsWithOrigin) {
      if (lot.origin_lot_id && !existingOriginIds.has(lot.origin_lot_id)) {
        errors.push({
          code: 'INVALID_LINEAGE_REFERENCE',
          message: `Lot references non-existent origin lot`,
          severity: 'critical',
          repairable: false,
        });
      }
    }

    if (errors.length === 0) {
      info.push('✓ All lineage references are valid');
    }

    return {
      success: errors.length === 0,
      validationType: 'lineage_validation',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  } catch (error) {
    errors.push({
      code: 'VALIDATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      severity: 'critical',
      repairable: false,
    });
    
    return {
      success: false,
      validationType: 'lineage_validation',
      timestamp: new Date(),
      errors,
      warnings,
      info,
    };
  }
}

// ============================================================================
// OPERATIONAL TIMELINE INSPECTOR
// ============================================================================

/**
 * Get operational timeline for an entity
 */
export async function getOperationalTimeline(
  entityType: 'lot' | 'cage',
  entityId: string,
  options?: {
    limit?: number;
    startTime?: Date;
    endTime?: Date;
  }
): Promise<OperationalTimelineEntry[]> {
  const entries: OperationalTimelineEntry[] = [];

  try {
    let query = supabase
      .from('operational_events')
      .select('*')
      .order('occurred_at', { ascending: false });

    if (entityType === 'lot') {
      query = query.eq('lot_id', entityId);
    } else if (entityType === 'cage') {
      query = query.or(`cage_id.eq.${entityId},from_cage_id.eq.${entityId}`);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.startTime) {
      query = query.gte('occurred_at', options.startTime.toISOString());
    }

    if (options?.endTime) {
      query = query.lte('occurred_at', options.endTime.toISOString());
    }

    const { data: events } = await query;

    if (events) {
      for (const event of events) {
        entries.push({
          eventId: event.id,
          eventType: event.event_type as EventType,
          category: event.event_category as EventCategory,
          timestamp: new Date(event.occurred_at),
          entityId: event.lot_id || event.cage_id,
          entityType: event.lot_id ? 'lot' : 'cage',
          metadata: event.event_data as Record<string, unknown>,
          actor: event.performed_by_name || event.performed_by,
          relatedEvents: [],
        });
      }
    }

    return entries;
  } catch (error) {
    console.error('Failed to get operational timeline:', error);
    return entries;
  }
}

/**
 * Get workflow execution trace (for debugging)
 */
export async function getWorkflowExecutionTrace(
  workflowName: string,
  timeRange?: { start: Date; end: Date }
): Promise<WorkflowExecutionTrace[]> {
  // This would require workflow execution logging
  // For now, return empty array - implementation depends on workflow tracking system
  return [];
}

// ============================================================================
// COMPREHENSIVE SYSTEM VALIDATION
// ============================================================================

/**
 * Run comprehensive system-wide validation
 */
export async function runComprehensiveValidation(): Promise<{
  overallSuccess: boolean;
  results: {
    negativeQuantities: ValidationResult;
    subdivisionTotals: ValidationResult;
    orphanMovements: ValidationResult;
    lineageReferences: ValidationResult;
  };
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalIssues: number;
  };
}> {
  const [negativeQuantities, subdivisionTotals, orphanMovements, lineageReferences] = await Promise.all([
    detectNegativeQuantities(),
    detectInvalidSubdivisionTotals(),
    detectOrphanMovementRecords(),
    detectInvalidLineageReferences(),
  ]);

  const totalErrors = [
    negativeQuantities.errors.length,
    subdivisionTotals.errors.length,
    orphanMovements.errors.length,
    lineageReferences.errors.length,
  ].reduce((a, b) => a + b, 0);

  const totalWarnings = [
    negativeQuantities.warnings.length,
    subdivisionTotals.warnings.length,
    orphanMovements.warnings.length,
    lineageReferences.warnings.length,
  ].reduce((a, b) => a + b, 0);

  const criticalIssues = [
    negativeQuantities.errors.filter(e => e.severity === 'critical').length,
    subdivisionTotals.errors.filter(e => e.severity === 'critical').length,
    orphanMovements.errors.filter(e => e.severity === 'critical').length,
    lineageReferences.errors.filter(e => e.severity === 'critical').length,
  ].reduce((a, b) => a + b, 0);

  return {
    overallSuccess: totalErrors === 0,
    results: {
      negativeQuantities,
      subdivisionTotals,
      orphanMovements,
      lineageReferences,
    },
    summary: {
      totalErrors,
      totalWarnings,
      criticalIssues,
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateLotOperationalChain,
  validateCageOperationalChain,
  rebuildProjectionFromEvents,
  detectNegativeQuantities,
  detectInvalidSubdivisionTotals,
  detectOrphanMovementRecords,
  detectInvalidLineageReferences,
  getOperationalTimeline,
  getWorkflowExecutionTrace,
  runComprehensiveValidation,
};
