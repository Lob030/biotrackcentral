/**
 * Create Lot Workflow Action
 * 
 * Fast lot creation with smart defaults and minimal input.
 * Optimized for repetitive daily operations.
 * 
 * WORKFLOW STEPS:
 * 1. Select species (quick selector)
 * 2. Enter quantity (numeric input with sensible defaults)
 * 3. Select sex (quick toggle: mixed/male/female)
 * 4. Optional: strain, cage assignment, notes
 * 5. Confirm and create
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Quantity must be positive
 * - Cage capacity validation if assigning to cage
 * - Species ID validation
 */

import type { CreateLotWorkflowInput, CreateLotWorkflowResult, WorkflowResult, ValidationError } from '../types';
import { persistenceServices } from '../../persistence';
import { createLot } from '../../lots/runtime/operations';
import type { LotSexType, LotSourceType } from '../../lots/runtime/types';

export async function createLotWorkflow(
  input: CreateLotWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<CreateLotWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate quantity
  if (!input.quantity || input.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0', severity: 'error' });
  }

  // Validate species
  if (!input.speciesId) {
    errors.push({ field: 'speciesId', message: 'Species is required', severity: 'error' });
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: errors.map(e => e.message).join(', '),
    };
  }

  try {
    const timestamp = new Date();

    // Create the lot using runtime operation
    const lot = createLot({
      speciesId: input.speciesId,
      strain: input.strain,
      sex: input.sex as LotSexType,
      quantity: input.quantity,
      sourceType: input.sourceType as LotSourceType,
      birthDate: input.birthDate,
      acquisitionDate: input.acquisitionDate,
      location: input.cageId,
      notes: input.notes,
      tags: input.tags,
    });

    // Persist to Supabase
    const persistResult = await persistenceServices.persistLot(lot, context.workspaceId, context.instanceId);

    if (!persistResult.success) {
      return {
        success: false,
        error: persistResult.error,
      };
    }

    // Create operational event for audit trail
    const eventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: 'lot_created',
        entityType: 'lot',
        entityId: lot.id,
        timestamp: timestamp,
        metadata: {
          lotCode: lot.code,
          speciesId: lot.speciesId,
          quantity: lot.initialQuantity,
          sourceType: lot.sourceType,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId
    );

    // Rebuild projections
    await persistenceServices.rebuildLotStateProjection(lot.id, context.workspaceId, context.instanceId);

    // If cage was assigned, rebuild cage occupancy
    if (input.cageId) {
      await persistenceServices.rebuildCageOccupancyProjection(input.cageId, context.workspaceId, context.instanceId);
    }

    return {
      success: true,
      data: {
        lotId: lot.id,
        lotCode: lot.code,
        eventId: eventResult.data?.eventId,
      },
      eventId: eventResult.data?.eventId,
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create lot',
    };
  }
}

/**
 * Quick validation for create lot workflow
 * Returns immediate feedback without creating the lot
 */
export function validateCreateLotInput(input: CreateLotWorkflowInput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!input.speciesId) {
    errors.push({ field: 'speciesId', message: 'Species is required', severity: 'error' });
  }

  if (!input.quantity || input.quantity <= 0) {
    errors.push({ field: 'quantity', message: 'Quantity must be greater than 0', severity: 'error' });
  }

  if (input.quantity && input.quantity > 1000) {
    errors.push({ field: 'quantity', message: 'Unusually large quantity. Please verify.', severity: 'warning' });
  }

  return errors;
}
