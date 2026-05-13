/**
 * Assign Lot to Cage Workflow Action
 * 
 * Quick initial cage assignment for a lot.
 * Used when creating a lot without immediate assignment or relocating.
 * 
 * WORKFLOW STEPS:
 * 1. Select lot (shows current quantity)
 * 2. Select cage (shows available space)
 * 3. Confirm and assign
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Cage capacity validation
 * - Lot must not already be assigned (or reassignment flow)
 */

import type { AssignLotToCageWorkflowInput, AssignLotToCageWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { getLotById } from '../../lots/runtime/operations';
import { getCageById } from '../../cages/runtime/operations';

export async function assignLotToCageWorkflow(
  input: AssignLotToCageWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<AssignLotToCageWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate lot exists
  const lot = getLotById(input.lotId);
  if (!lot) {
    return { success: false, error: 'Lot not found' };
  }

  // Validate cage exists and has capacity
  const cage = getCageById(input.cageId);
  if (!cage) {
    errors.push({ field: 'cageId', message: 'Cage not found', severity: 'error' });
  } else {
    const availableSpace = cage.capacity - cage.currentOccupancy;
    if (lot.currentQuantity > availableSpace) {
      errors.push({
        field: 'cageId',
        message: `Insufficient space. Available: ${availableSpace}, Need: ${lot.currentQuantity}`,
        severity: 'error',
      });
    }
  }

  if (errors.filter(e => e.severity === 'error').length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = new Date();

    // Update lot location
    const updatedLot = {
      ...lot,
      location: input.cageId,
      updatedAt: timestamp,
    };

    // Persist updated lot
    const persistResult = await persistenceServices.persistLot(updatedLot, context.workspaceId, context.instanceId);

    if (!persistResult.success) {
      return { success: false, error: persistResult.error };
    }

    // Create lot assignment event
    const assignmentResult = await persistenceServices.persistLotAssignment(
      {
        id: crypto.randomUUID(),
        lotId: input.lotId,
        cageId: input.cageId,
        assignmentDate: timestamp,
        quantity: lot.currentQuantity,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      context.workspaceId,
      context.instanceId
    );

    // Create operational event
    const opEventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: 'lot_assigned_to_cage',
        entityType: 'lot',
        entityId: input.lotId,
        timestamp: timestamp,
        metadata: {
          cageId: input.cageId,
          quantity: lot.currentQuantity,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId
    );

    // Rebuild projections
    await persistenceServices.rebuildCageOccupancyProjection(input.cageId, context.workspaceId, context.instanceId);
    await persistenceServices.rebuildLotStateProjection(input.lotId, context.workspaceId, context.instanceId);

    return {
      success: true,
      data: {
        lotId: input.lotId,
        cageId: input.cageId,
        assignmentEventId: assignmentResult.data?.eventId,
      },
      eventId: opEventResult.data?.eventId,
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign lot to cage',
    };
  }
}

/**
 * Quick validation for cage assignment
 */
export function validateCageAssignment(
  lotQuantity: number,
  cageAvailableSpace: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (lotQuantity > cageAvailableSpace) {
    errors.push({
      field: 'cageId',
      message: `Lot (${lotQuantity}) exceeds cage space (${cageAvailableSpace})`,
      severity: 'error',
    });
  }

  return errors;
}
