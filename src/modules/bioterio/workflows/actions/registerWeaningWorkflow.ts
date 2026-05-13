/**
 * Register Weaning Workflow Action
 * 
 * Process weaning of a litter lot into new subdivided lots.
 * Converts nursing litter into independent lots by sex.
 * 
 * WORKFLOW STEPS:
 * 1. Select litter lot (shows age and current quantity)
 * 2. Define weaning subdivisions (sex + quantity for each)
 * 3. Review total allocation vs available
 * 4. Confirm and execute weaning
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Total weaned quantity cannot exceed litter size
 * - Litter must be old enough for weaning (typically 21+ days)
 * - Each subdivision must have positive quantity
 */

import type { RegisterWeaningWorkflowInput, RegisterWeaningWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { subdivideLot } from '../../lots/runtime/operations';
import { getLotById } from '../../lots/runtime/operations';

export async function registerWeaningWorkflow(
  input: RegisterWeaningWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<RegisterWeaningWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate litter lot exists
  const litterLot = getLotById(input.litterLotId);
  if (!litterLot) {
    return { success: false, error: 'Litter lot not found' };
  }

  // Check if lot is old enough for weaning (optional safeguard)
  if (litterLot.birthDate) {
    const birthDate = new Date(litterLot.birthDate);
    const weaningDate = input.weaningDate || new Date();
    const ageInDays = Math.floor((weaningDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (ageInDays < 18) {
      errors.push({
        field: 'litterLotId',
        message: `Litter is only ${ageInDays} days old. Typical weaning age is 21+ days.`,
        severity: 'warning',
      });
    }
  }

  // Validate subdivisions
  if (!input.subdivisions || input.subdivisions.length === 0) {
    errors.push({ field: 'subdivisions', message: 'At least one subdivision required', severity: 'error' });
  } else {
    const totalQuantity = input.subdivisions.reduce((sum, sub) => sum + sub.quantity, 0);

    if (totalQuantity > litterLot.currentQuantity) {
      errors.push({
        field: 'subdivisions',
        message: `Total (${totalQuantity}) exceeds litter size (${litterLot.currentQuantity})`,
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
  }

  if (errors.filter(e => e.severity === 'error').length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = input.weaningDate || new Date();
    const eventIds: string[] = [];

    // Execute subdivision (weaning creates new lots from the litter)
    const result = subdivideLot({
      lotId: input.litterLotId,
      subdivisions: input.subdivisions.map(sub => ({
        sex: sub.sex,
        quantity: sub.quantity,
        codeSuffix: sub.sex === 'male' ? '-M' : sub.sex === 'female' ? '-F' : undefined,
        notes: sub.notes,
      })),
      notes: input.notes,
    });

    // Persist child lots (weaned lots)
    const weanedLotIds: string[] = [];
    for (const childLot of result.childLots) {
      const persistResult = await persistenceServices.persistLot(childLot, context.workspaceId, context.instanceId);
      if (persistResult.success) {
        weanedLotIds.push(childLot.id);
      }
    }

    // Create operational events for weaning
    for (const childLot of result.childLots) {
      const eventResult = await persistenceServices.persistOperationalEvent(
        {
          eventType: 'lot_weaned',
          entityType: 'lot',
          entityId: childLot.id,
          timestamp: timestamp,
          metadata: {
            parentLotId: input.litterLotId,
            lotCode: childLot.code,
            quantity: childLot.initialQuantity,
            sex: childLot.sex,
            weaningDate: timestamp.toISOString(),
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
    await persistenceServices.persistLot(result.parentLot, context.workspaceId, context.instanceId);

    // Rebuild projections
    await persistenceServices.rebuildLotStateProjection(input.litterLotId, context.workspaceId, context.instanceId);
    for (const lotId of weanedLotIds) {
      await persistenceServices.rebuildLotStateProjection(lotId, context.workspaceId, context.instanceId);
    }

    return {
      success: true,
      data: {
        originalLotId: input.litterLotId,
        weanedLotIds,
        eventIds,
      },
      eventId: eventIds[0],
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register weaning',
    };
  }
}

/**
 * Quick validation for weaning input
 */
export function validateWeaningInput(
  subdivisions: Array<{ quantity: number }>,
  litterQuantity: number,
  litterAgeDays?: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!subdivisions || subdivisions.length === 0) {
    errors.push({ field: 'subdivisions', message: 'Subdivisions required', severity: 'error' });
    return errors;
  }

  const totalQuantity = subdivisions.reduce((sum, sub) => sum + sub.quantity, 0);

  if (totalQuantity > litterQuantity) {
    errors.push({
      field: 'subdivisions',
      message: `Total (${totalQuantity}) exceeds litter (${litterQuantity})`,
      severity: 'error',
    });
  }

  if (litterAgeDays !== undefined && litterAgeDays < 18) {
    errors.push({
      field: 'litterLotId',
      message: `Young litter (${litterAgeDays} days)`,
      severity: 'warning',
    });
  }

  return errors;
}
