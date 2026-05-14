/**
 * Move Lot Workflow Action
 * 
 * Quick cage-to-cage lot movement.
 * Optimized for daily animal transfers between cages.
 * 
 * WORKFLOW STEPS:
 * 1. Select lot (shows current cage)
 * 2. Select destination cage (shows available space)
 * 3. Optional: quantity if partial move, notes
 * 4. Confirm and execute
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Destination cage capacity validation
 * - Source cage must contain the lot
 * - Quantity cannot exceed lot size
 */

import type { MoveLotWorkflowInput, MoveLotWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { moveLot, getCageById } from '../../cages/runtime/operations';
import { getLotById } from '../../lots/runtime/operations';

export async function moveLotWorkflow(
  input: MoveLotWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<MoveLotWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate lot exists
  const lot = getLotById(input.lotId);
  if (!lot) {
    return { success: false, error: 'Lot not found' };
  }

  // Validate source cage
  const sourceCage = getCageById(input.fromCageId);
  if (!sourceCage) {
    errors.push({ field: 'fromCageId', message: 'Source cage not found', severity: 'error' });
  }

  // Validate destination cage
  const destCage = getCageById(input.toCageId);
  if (!destCage) {
    errors.push({ field: 'toCageId', message: 'Destination cage not found', severity: 'error' });
  } else {
    // Check capacity
    const moveQuantity = input.quantity || lot.currentQuantity;
    const availableSpace = destCage.capacity - destCage.currentOccupancy;
    
    if (moveQuantity > availableSpace) {
      errors.push({
        field: 'toCageId',
        message: `Insufficient space. Available: ${availableSpace}, Need: ${moveQuantity}`,
        severity: 'error',
      });
    }
  }

  // Validate quantity
  const moveQty = input.quantity || lot.currentQuantity;
  if (moveQty > lot.currentQuantity) {
    errors.push({
      field: 'quantity',
      message: `Cannot move ${moveQty}. Lot has ${lot.currentQuantity} animals.`,
      severity: 'error',
    });
  }

  if (errors.filter(e => e.severity === 'error').length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = new Date();

    // Execute movement using runtime operation
    const result = moveLot({
      lotId: input.lotId,
      fromCageId: input.fromCageId,
      toCageId: input.toCageId,
      quantity: input.quantity,
      notes: input.notes,
    });

    // Persist updated lot
    const persistResult = await persistenceServices.persistLot(result.lot, context.workspaceId, context.instanceId);

    if (!persistResult.success) {
      return { success: false, error: persistResult.error };
    }

    // Create cage movement event
    const movementEventResult = await persistenceServices.persistCageMovement(
      {
        id: crypto.randomUUID(),
        lotId: input.lotId,
        fromCageId: input.fromCageId,
        toCageId: input.toCageId,
        quantity: moveQty,
        movementDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        notes: input.notes,
      },
      context.workspaceId,
      context.instanceId
    );

    // Create lot assignment event
    const assignmentEventResult = await persistenceServices.persistLotAssignment(
      {
        id: crypto.randomUUID(),
        lotId: input.lotId,
        cageId: input.toCageId,
        assignmentDate: timestamp,
        quantity: moveQty,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      context.workspaceId,
      context.instanceId
    );

    // Create operational event
    const opEventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: 'lot_moved',
        entityType: 'lot',
        entityId: input.lotId,
        timestamp: timestamp,
        metadata: {
          fromCageId: input.fromCageId,
          toCageId: input.toCageId,
          quantity: moveQty,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId
    );

    // Rebuild projections for affected cages
    await persistenceServices.rebuildCageOccupancyProjection(input.fromCageId, context.workspaceId, context.instanceId);
    await persistenceServices.rebuildCageOccupancyProjection(input.toCageId, context.workspaceId, context.instanceId);
    await persistenceServices.rebuildLotStateProjection(input.lotId, context.workspaceId, context.instanceId);

    return {
      success: true,
      data: {
        lotId: input.lotId,
        movementEventId: movementEventResult.data?.eventId,
        assignmentEventId: assignmentEventResult.data?.eventId,
      },
      eventId: opEventResult.data?.eventId,
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to move lot',
    };
  }
}

/**
 * Quick validation for move lot input
 */
export function validateMoveLotInput(
  lotId: string,
  toCageId: string,
  quantity: number | undefined,
  lotCurrentQuantity: number,
  destCageAvailableSpace: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  const moveQty = quantity || lotCurrentQuantity;

  if (moveQty > lotCurrentQuantity) {
    errors.push({
      field: 'quantity',
      message: `Exceeds lot size (${lotCurrentQuantity})`,
      severity: 'error',
    });
  }

  if (moveQty > destCageAvailableSpace) {
    errors.push({
      field: 'toCageId',
      message: `Insufficient cage space (${destCageAvailableSpace} available)`,
      severity: 'error',
    });
  }

  return errors;
}
