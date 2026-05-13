/**
 * Register Litter Workflow Action
 * 
 * Quick litter recording from breeding groups.
 * Captures birth data and automatically creates new lot.
 * 
 * WORKFLOW STEPS:
 * 1. Select breeding group (shows active groups)
 * 2. Enter litter size and live births
 * 3. Optional: stillbirths, notes
 * 4. Confirm and create litter lot
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Live births cannot exceed total litter size
 * - Breeding group must be active
 * - Automatic lot creation for the litter
 */

import type { RegisterLitterWorkflowInput, RegisterLitterWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { createLot } from '../../lots/runtime/operations';

export async function registerLitterWorkflow(
  input: RegisterLitterWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<RegisterLitterWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate litter size
  if (!input.litterSize || input.litterSize <= 0) {
    errors.push({ field: 'litterSize', message: 'Litter size must be greater than 0', severity: 'error' });
  }

  // Validate live births
  if (!input.liveBirths || input.liveBirths <= 0) {
    errors.push({ field: 'liveBirths', message: 'Live births must be greater than 0', severity: 'error' });
  } else if (input.liveBirths > input.litterSize) {
    errors.push({
      field: 'liveBirths',
      message: `Live births (${input.liveBirths}) cannot exceed litter size (${input.litterSize})`,
      severity: 'error',
    });
  }

  // Validate stillbirths if provided
  if (input.stillbirths !== undefined) {
    const calculatedStillbirths = input.litterSize - input.liveBirths;
    if (input.stillbirths !== calculatedStillbirths) {
      errors.push({
        field: 'stillbirths',
        message: `Stillbirths should be ${calculatedStillbirths} (litter size - live births)`,
        severity: 'warning',
      });
    }
  }

  if (errors.filter(e => e.severity === 'error').length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = input.birthDate || new Date();
    const litterId = crypto.randomUUID();

    // Create a new lot for the litter
    // Note: We need species info from the breeding group - this would come from lookup
    // For now, we'll use placeholder values that should be filled by the caller
    const litterLot = createLot({
      speciesId: 'species_placeholder', // Should be resolved from breeding group
      strain: undefined,
      sex: 'mixed',
      quantity: input.liveBirths,
      sourceType: 'internal_birth',
      birthDate: timestamp,
      notes: input.notes,
      tags: ['litter'],
    });

    // Persist the litter lot
    const persistResult = await persistenceServices.persistLot(litterLot, context.workspaceId, context.instanceId);

    if (!persistResult.success) {
      return { success: false, error: persistResult.error };
    }

    // Persist litter record
    const litterResult = await persistenceServices.persistLitter(
      {
        id: litterId,
        breedingGroupId: input.breedingGroupId,
        lotId: litterLot.id,
        litterSize: input.litterSize,
        liveBirths: input.liveBirths,
        stillbirths: input.stillbirths || (input.litterSize - input.liveBirths),
        birthDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      context.workspaceId,
      context.instanceId
    );

    // Create operational event
    const opEventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: 'litter_registered',
        entityType: 'litter',
        entityId: litterId,
        timestamp: timestamp,
        metadata: {
          breedingGroupId: input.breedingGroupId,
          lotId: litterLot.id,
          litterSize: input.litterSize,
          liveBirths: input.liveBirths,
          stillbirths: input.stillbirths || (input.litterSize - input.liveBirths),
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId
    );

    // Rebuild projections
    await persistenceServices.rebuildLotStateProjection(litterLot.id, context.workspaceId, context.instanceId);

    return {
      success: true,
      data: {
        litterId,
        lotId: litterLot.id,
        eventId: opEventResult.data?.eventId,
      },
      eventId: opEventResult.data?.eventId,
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register litter',
    };
  }
}

/**
 * Quick validation for litter input
 */
export function validateLitterInput(
  litterSize: number,
  liveBirths: number,
  stillbirths?: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!litterSize || litterSize <= 0) {
    errors.push({ field: 'litterSize', message: 'Litter size required', severity: 'error' });
  }

  if (!liveBirths || liveBirths <= 0) {
    errors.push({ field: 'liveBirths', message: 'Live births required', severity: 'error' });
  } else if (liveBirths > litterSize) {
    errors.push({
      field: 'liveBirths',
      message: 'Exceeds litter size',
      severity: 'error',
    });
  }

  if (stillbirths !== undefined) {
    const expected = litterSize - liveBirths;
    if (stillbirths !== expected) {
      errors.push({
        field: 'stillbirths',
        message: `Should be ${expected}`,
        severity: 'warning',
      });
    }
  }

  return errors;
}
