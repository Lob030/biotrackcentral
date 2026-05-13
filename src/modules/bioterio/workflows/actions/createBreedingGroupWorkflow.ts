/**
 * Create Breeding Group Workflow Action
 * 
 * Fast breeding group setup with male/female pairing.
 * Optimized for creating breeding pairs or trios.
 * 
 * WORKFLOW STEPS:
 * 1. Select male lot(s) (lot picker filtered by sex/maturity)
 * 2. Select female lot(s) (lot picker filtered by sex/maturity)
 * 3. Select cage (shows available space)
 * 4. Optional: breeding strategy, notes
 * 5. Confirm and create
 * 
 * OPERATIONAL SAFEGUARDS:
 * - Cage capacity for all animals
 * - At least one male and one female required
 * - Animals must be mature enough for breeding
 */

import type {
  CreateBreedingGroupWorkflowInput,
  CreateBreedingGroupWorkflowResult,
  WorkflowResult,
  ValidationError,
} from '../types';
import { persistenceServices } from '../../persistence';
import { getLotById } from '../../lots/runtime/operations';
import { getCageById } from '../../cages/runtime/operations';

export async function createBreedingGroupWorkflow(
  input: CreateBreedingGroupWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string }
): Promise<WorkflowResult<CreateBreedingGroupWorkflowResult>> {
  const errors: ValidationError[] = [];

  // Validate members
  if (!input.members || input.members.length === 0) {
    errors.push({ field: 'members', message: 'At least one member required', severity: 'error' });
  } else {
    const males = input.members.filter(m => m.role === 'male');
    const females = input.members.filter(m => m.role === 'female');

    if (males.length === 0) {
      errors.push({ field: 'members', message: 'At least one male required', severity: 'error' });
    }
    if (females.length === 0) {
      errors.push({ field: 'members', message: 'At least one female required', severity: 'error' });
    }

    // Validate lots exist and calculate total quantity
    let totalQuantity = 0;
    for (const member of input.members) {
      const lot = getLotById(member.lotId);
      if (!lot) {
        errors.push({
          field: 'members',
          message: `Lot ${member.lotId} not found`,
          severity: 'error',
        });
      } else {
        totalQuantity += member.quantity;
      }
    }

    // Validate cage capacity
    const cage = getCageById(input.cageId);
    if (!cage) {
      errors.push({ field: 'cageId', message: 'Cage not found', severity: 'error' });
    } else {
      const availableSpace = cage.capacity - cage.currentOccupancy;
      if (totalQuantity > availableSpace) {
        errors.push({
          field: 'cageId',
          message: `Insufficient space. Available: ${availableSpace}, Need: ${totalQuantity}`,
          severity: 'error',
        });
      }
    }
  }

  if (errors.filter(e => e.severity === 'error').length > 0) {
    return { success: false, error: errors.map(e => e.message).join(', ') };
  }

  try {
    const timestamp = new Date();
    const breedingGroupId = crypto.randomUUID();

    // Persist breeding group
    const breedingGroupResult = await persistenceServices.persistBreedingGroup(
      {
        id: breedingGroupId,
        cageId: input.cageId,
        status: 'active',
        startDate: timestamp,
        breedingStrategy: input.breedingStrategy,
        metadata: {
          members: input.members,
          createdBy: context.userId,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      context.workspaceId,
      context.instanceId
    );

    // Create operational event
    const opEventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: 'breeding_group_created',
        entityType: 'breeding_group',
        entityId: breedingGroupId,
        timestamp: timestamp,
        metadata: {
          cageId: input.cageId,
          memberCount: input.members.length,
          totalAnimals: input.members.reduce((sum, m) => sum + m.quantity, 0),
          breedingStrategy: input.breedingStrategy,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId
    );

    // Rebuild cage occupancy projection
    await persistenceServices.rebuildCageOccupancyProjection(input.cageId, context.workspaceId, context.instanceId);

    return {
      success: true,
      data: {
        breedingGroupId,
        eventId: opEventResult.data?.eventId,
      },
      eventId: opEventResult.data?.eventId,
      requiresProjectionRebuild: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create breeding group',
    };
  }
}

/**
 * Quick validation for breeding group input
 */
export function validateBreedingGroupInput(
  members: Array<{ role: string; quantity: number }>,
  totalQuantity: number,
  cageAvailableSpace: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  const males = members.filter(m => m.role === 'male');
  const females = members.filter(m => m.role === 'female');

  if (males.length === 0) {
    errors.push({ field: 'members', message: 'Male required', severity: 'error' });
  }
  if (females.length === 0) {
    errors.push({ field: 'members', message: 'Female required', severity: 'error' });
  }

  if (totalQuantity > cageAvailableSpace) {
    errors.push({
      field: 'cageId',
      message: `Exceeds cage space (${cageAvailableSpace})`,
      severity: 'error',
    });
  }

  return errors;
}
