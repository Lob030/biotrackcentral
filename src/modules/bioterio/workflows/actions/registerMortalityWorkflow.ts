/**
 * Register Mortality Workflow Action
 * 
 * Quick mortality logging with minimal friction.
 * One of the most frequent daily operations.
 * 
 * WORKFLOW STEPS:
 * 1. Select lot (lot picker showing current quantity)
 * 2. Enter deceased quantity (numeric input)
 * 3. Optional: select reason, add notes
 * 4. Confirm and log
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Cannot exceed current lot quantity
 * - Warning on unusually high mortality rates
 * - Requires reason for significant losses
 */

import type { RegisterMortalityWorkflowInput, RegisterMortalityWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { registerMortality } from '../../lots/runtime/operations';
import { getLotById } from '../../lots/runtime/operations';

export async function registerMortalityWorkflow(
  input: RegisterMortalityWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<RegisterMortalityWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate lot exists
  const lot = getLotById(input.lotId);
  if (!lot) {
    return { success: false, error: 'Lot not found' };
  }

  // Validate quantity
  if (!input.quantity || input.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0', severity: 'error' });
  } else if (input.quantity > lot.currentQuantity) {
    errors.push({
      field: 'quantity',
      message: `Cannot record ${input.quantity} deaths. Only ${lot.currentQuantity} animals in lot.`,
      severity: 'error',
    });
  } else {
    // Check for high mortality rate warning
    const mortalityRate = input.quantity / lot.currentQuantity;
    if (mortalityRate > 0.5) {
      errors.push({
        field: 'quantity',
        message: `High mortality rate (${Math.round(mortalityRate * 100)}%). Please verify.`,
        severity: 'warning',
      });
    }
  }

  if (errors.filter(e => e.severity === 'error').length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = new Date();

    // Execute mortality registration
    const result = registerMortality({
      lotId: input.lotId,
      quantity: input.quantity,
      reason: input.reason,
      notes: input.notes,
    });

    // Persist updated lot state
    const persistResult = await persistenceServices.persistLot(result.lot, context.workspaceId, context.instanceId);

    if (!persistResult.success) {
      return { success: false, error: persistResult.error };
    }

    // Create operational event
    const eventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: 'mortality_registered',
        entityType: 'lot',
        entityId: input.lotId,
        timestamp: timestamp,
        metadata: {
          quantity: input.quantity,
          reason: input.reason,
          remainingQuantity: result.lot.currentQuantity,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId
    );

    // Rebuild projections
    await persistenceServices.rebuildLotStateProjection(input.lotId, context.workspaceId, context.instanceId);

    // If lot is in a cage, rebuild cage occupancy
    if (lot.location) {
      await persistenceServices.rebuildCageOccupancyProjection(lot.location, context.workspaceId, context.instanceId);
    }

    return {
      success: true,
      data: {
        lotId: input.lotId,
        eventId: eventResult.data?.eventId,
        remainingQuantity: result.lot.currentQuantity,
      },
      eventId: eventResult.data?.eventId,
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register mortality',
    };
  }
}

/**
 * Quick validation for mortality input
 */
export function validateMortalityInput(
  lotId: string,
  quantity: number,
  currentQuantity: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!quantity || quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Positive quantity required', severity: 'error' });
  } else if (quantity > currentQuantity) {
    errors.push({
      field: 'quantity',
      message: `Exceeds available (${currentQuantity})`,
      severity: 'error',
    });
  } else if (quantity / currentQuantity > 0.5) {
    errors.push({
      field: 'quantity',
      message: `High mortality (${Math.round((quantity / currentQuantity) * 100)}%)`,
      severity: 'warning',
    });
  }

  return errors;
}
