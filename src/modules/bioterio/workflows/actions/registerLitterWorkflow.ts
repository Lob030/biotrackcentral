/**
 * Register Litter Workflow
 *
 * Requires `speciesProfileId` from the caller. Looking it up from the
 * breeding group is the caller's responsibility — this workflow refuses
 * to guess.
 */

import type {
  RegisterLitterWorkflowInput,
  RegisterLitterWorkflowResult,
  WorkflowResult,
  ValidationError,
} from "../types";
import { persistenceServices } from "../../persistence";
import { createLot } from "../../lots/runtime/operations";

export async function registerLitterWorkflow(
  input: RegisterLitterWorkflowInput,
  context: { workspaceId: string; instanceId: string; userId: string },
): Promise<WorkflowResult<RegisterLitterWorkflowResult>> {
  const errors: ValidationError[] = [];

  if (!input.speciesProfileId) {
    errors.push({
      field: "speciesProfileId",
      message: "speciesProfileId is required (resolve from breeding group upstream)",
      severity: "error",
    });
  }
  if (!input.litterSize || input.litterSize <= 0) {
    errors.push({ field: "litterSize", message: "Litter size must be > 0", severity: "error" });
  }
  if (!input.liveBirths || input.liveBirths <= 0) {
    errors.push({ field: "liveBirths", message: "Live births must be > 0", severity: "error" });
  } else if (input.liveBirths > input.litterSize) {
    errors.push({
      field: "liveBirths",
      message: `Live births (${input.liveBirths}) cannot exceed litter size (${input.litterSize})`,
      severity: "error",
    });
  }

  if (errors.filter((e) => e.severity === "error").length > 0) {
    return { success: false, error: errors.map((e) => e.message).join(", ") };
  }

  try {
    const timestamp = input.birthDate ?? new Date();
    const litterId = crypto.randomUUID();

    const litterLot = createLot({
      speciesProfileId: input.speciesProfileId,
      sex: "mixed",
      quantity: input.liveBirths,
      sourceType: "internal_birth",
      birthDate: timestamp,
      notes: input.notes,
      tags: ["litter"],
    });

    const persistResult = await persistenceServices.persistLot(
      litterLot,
      context.workspaceId,
      context.instanceId,
    );
    if (!persistResult.success) return { success: false, error: persistResult.error };

    await persistenceServices.persistLitter(
      {
        id: litterId,
        breedingGroupId: input.breedingGroupId,
        lotId: litterLot.id,
        litterSize: input.litterSize,
        liveBirths: input.liveBirths,
        stillbirths: input.stillbirths ?? input.litterSize - input.liveBirths,
        birthDate: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      context.workspaceId,
      context.instanceId,
    );

    const opEventResult = await persistenceServices.persistOperationalEvent(
      {
        eventType: "litter_registered",
        entityType: "litter",
        entityId: litterId,
        timestamp,
        metadata: {
          breedingGroupId: input.breedingGroupId,
          lotId: litterLot.id,
          speciesProfileId: input.speciesProfileId,
          litterSize: input.litterSize,
          liveBirths: input.liveBirths,
          stillbirths: input.stillbirths ?? input.litterSize - input.liveBirths,
          createdBy: context.userId,
        },
      },
      context.workspaceId,
      context.instanceId,
    );

    await persistenceServices.rebuildLotStateProjection(
      litterLot.id,
      context.workspaceId,
      context.instanceId,
    );

    return {
      success: true,
      data: {
        litterId,
        lotId: litterLot.id,
        eventId: opEventResult.data?.eventId,
      },
      eventId: opEventResult.data?.eventId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register litter",
    };
  }
}

export function validateLitterInput(
  litterSize: number,
  liveBirths: number,
  stillbirths?: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!litterSize || litterSize <= 0) {
    errors.push({ field: "litterSize", message: "Required", severity: "error" });
  }
  if (!liveBirths || liveBirths <= 0) {
    errors.push({ field: "liveBirths", message: "Required", severity: "error" });
  } else if (liveBirths > litterSize) {
    errors.push({ field: "liveBirths", message: "Exceeds litter size", severity: "error" });
  }
  if (stillbirths !== undefined && stillbirths !== litterSize - liveBirths) {
    errors.push({
      field: "stillbirths",
      message: `Should be ${litterSize - liveBirths}`,
      severity: "warning",
    });
  }
  return errors;
}
