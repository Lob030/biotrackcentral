/**
 * Subdivide Lot Workflow Action
 * 
 * Fast lot subdivision with quantity allocation.
 * Optimized for splitting lots by sex or creating smaller groups.
 * 
 * WORKFLOW STEPS:
 * 1. Select source lot (lot picker with quantity display)
 * 2. Define subdivisions (quantity + sex for each)
 * 3. Review total allocation vs available
 * 4. Confirm and execute
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Total subdivided quantity cannot exceed available
 * - Each subdivision must have positive quantity
 * - Source lot must be active
 */

import type { SubdivideLotWorkflowInput, SubdivideLotWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { subdivideLot } from '../../lots/runtime/operations';
import { getLotById } from '../../lots/runtime/operations';

export async function subdivideLotWorkflow(
  input: SubdivideLotWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<SubdivideLotWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate lot exists and is active
  const sourceLot = getLotById(input.lotId);
  if (!sourceLot) {
    return { success: false, error: 'Source lot not found' };
  }

  if (sourceLot.status !== 'active') {
    errors.push({ field: 'lotId', message: 'Only active lots can be subdivided', severity: 'error' });
  }

  // Validate subdivisions
  if (!input.subdivisions || input.subdivisions.length === 0) {
    errors.push({ field: 'subdivisions', message: 'At least one subdivision is required', severity: 'error' });
  } else {
    const totalQuantity = input.subdivisions.reduce((sum, sub) => sum + sub.quantity, 0);
    
    if (totalQuantity > sourceLot.currentQuantity) {
      errors.push({ 
        field: 'subdivisions', 
        message: `Total subdivision quantity (${totalQuantity}) exceeds available (${sourceLot.currentQuantity})`, 
        severity: 'error' 
      });
    }

    input.subdivisions.forEach((sub, index) => {
      if (!sub.quantity || sub.quantity <= 0) {
        errors.push({ field: `subdivisions[${index}].quantity`, message: 'Quantity must be positive', severity: 'error' });
      }
    });
  }

  if (errors.length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = new Date();
    const eventIds: string[] = [];

    // Execute subdivision using runtime operation
    const result = subdivideLot({
      lotId: input.lotId,
      subdivisions: input.subdivisions.map(sub => ({
        sex: sub.sex,
        quantity: sub.quantity,
        codeSuffix: sub.codeSuffix,
        notes: sub.notes,
      })),
      notes: input.notes,
    });

    // Persist child lots
    const childLotIds: string[] = [];
    for (const childLot of result.childLots) {
      const persistResult = await persistenceServices.persistLot(childLot, context.workspaceId, context.instanceId);
      if (persistResult.success) {
        childLotIds.push(childLot.id);
      }
    }

    // Create operational events for each child lot
    for (const childLot of result.childLots) {
      const eventResult = await persistenceServices.persistOperationalEvent(
        {
          eventType: 'lot_subdivided',
          entityType: 'lot',
          entityId: childLot.id,
          timestamp: timestamp,
          metadata: {
            parentLotId: input.lotId,
            lotCode: childLot.code,
            quantity: childLot.initialQuantity,
            sex: childLot.sex,
            createdBy: context.userId,
          },
        },
        context.workspaceId,
        context.instanceId
      );
      if (eventResult.data?.eventId) {
        eventIds.push(eventResult.data.eventId);
      }
    }

    // Update parent lot status
    const parentUpdateResult = await persistenceServices.persistLot(result.parentLot, context.workspaceId, context.instanceId);

    // Rebuild projections for all affected lots
    await persistenceServices.rebuildLotStateProjection(input.lotId, context.workspaceId, context.instanceId);
    for (const childLotId of childLotIds) {
      await persistenceServices.rebuildLotStateProjection(childLotId, context.workspaceId, context.instanceId);
    }

    return {
      success: true,
      data: {
        originalLotId: input.lotId,
        childLotIds,
        eventIds,
      },
      eventId: eventIds[0],
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to subdivide lot',
    };
  }
}

/**
 * Quick validation for subdivision input
 */
export function validateSubdivideLotInput(
  input: SubdivideLotWorkflowInput,
  availableQuantity: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.subdivisions || input.subdivisions.length === 0) {
    errors.push({ field: 'subdivisions', message: 'At least one subdivision required', severity: 'error' });
    return errors;
  }

  const totalQuantity = input.subdivisions.reduce((sum, sub) => sum + sub.quantity, 0);

  if (totalQuantity > availableQuantity) {
    errors.push({
      field: 'subdivisions',
      message: `Total (${totalQuantity}) exceeds available (${availableQuantity})`,
      severity: 'error',
    });
  }

  input.subdivisions.forEach((sub, index) => {
    if (!sub.quantity || sub.quantity <= 0) {
      errors.push({
        field: `subdivisions[${index}].quantity`,
        message: 'Positive quantity required',
        severity: 'error',
      });
    }
  });

  return errors;
}
