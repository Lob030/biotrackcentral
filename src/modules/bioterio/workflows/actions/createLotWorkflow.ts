/**
 * Create Lot Workflow
 *
 * Strict speciesProfileId pipeline. Workflow rejects any input lacking a
 * resolved species profile — no fallbacks.
 */

import type {
  CreateLotWorkflowInput,
  CreateLotWorkflowResult,
  WorkflowResult,
  ValidationError,
} from "../types";
import { persistenceServices } from "../../persistence";
import { createLot } from "../../lots/runtime/operations";
import type { LotSexType, LotSourceType } from "../../lots/runtime/types";

export async function createLotWorkflow(
  input: CreateLotWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string },
): Promise<WorkflowResult<CreateLotWorkflowResult>> {
  const errors: ValidationError[] = [];

  if (!input.quantity || input.quantity <= 0) {
    errors.push({ field: "quantity", message: "Quantity must be > 0", severity: "error" });
  }
  if (!input.speciesProfileId) {
    errors.push({
      field: "speciesProfileId",
      message: "speciesProfileId is required (no fallback)",
      severity: "error",
    });
  }

  if (errors.length > 0) {
    return { success: false, error: errors.map((e) => e.message).join(", ") };
  }

  try {
    const timestamp = new Date();
    const lot = createLot({
      speciesProfileId: input.speciesProfileId,
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

    const persistResult = await persistenceServices.persistLot(
      lot,
      context.workspaceId,
      context.instanceId,
    );
    if (!persistResult.success) return { success: false, error: persistResult.error };

    const eventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: "lot_created",
        entityType: "lot",
        entityId: lot.id,
        timestamp,
        metadata: {
          lotCode: lot.code,
          speciesProfileId: lot.speciesProfileId,
          quantity: lot.initialQuantity,
          sourceType: lot.sourceType,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId,
    );

    await persistenceServices.rebuildLotStateProjection(
      lot.id,
      context.workspaceId,
      context.instanceId,
    );
    if (input.cageId) {
      await persistenceServices.rebuildCageOccupancyProjection(
        input.cageId,
        context.workspaceId,
        context.instanceId,
      );
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
      error: error instanceof Error ? error.message : "Failed to create lot",
    };
  }
}

export function validateCreateLotInput(
  input: CreateLotWorkflowInput,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!input.speciesProfileId) {
    errors.push({
      field: "speciesProfileId",
      message: "speciesProfileId is required",
      severity: "error",
    });
  }
  if (!input.quantity || input.quantity <= 0) {
    errors.push({ field: "quantity", message: "Quantity must be > 0", severity: "error" });
  }
  if (input.quantity && input.quantity > 1000) {
    errors.push({
      field: "quantity",
      message: "Unusually large quantity. Verify.",
      severity: "warning",
    });
  }
  return errors;
}
