/**
 * Maps an approved OperationalPlan to the matching workflow function via
 * useWorkflowActions. Single-op only — no batching.
 */
import type { useWorkflowActions } from "../workflows/hooks/useWorkflowActions";
import type { WorkflowResult } from "../workflows/types";
import type { PlannedOperation } from "./client";

type Actions = ReturnType<typeof useWorkflowActions>;

export interface ExecutorContext {
  resolved: ResolvedRefs;
}

export interface ResolvedRefs {
  lotId?: string;
  fromCageId?: string;
  toCageId?: string;
  cageId?: string;
  maleLotId?: string;
  femaleLotId?: string;
  breedingGroupId?: string;
  litterLotId?: string;
  /** Resolved by the AI edge function from speciesProfileId or speciesName. */
  speciesProfileId?: string;
}

export async function executeOperation(
  op: PlannedOperation,
  actions: Actions,
): Promise<WorkflowResult> {
  const args = op.args as Record<string, unknown>;
  const resolved = (args._resolved ?? {}) as ResolvedRefs;

  switch (op.intent) {
    case "CREATE_LOT": {
      const speciesProfileId =
        resolved.speciesProfileId ?? (args.speciesProfileId as string | undefined);
      if (!speciesProfileId) {
        return { success: false, error: "Species profile not resolved" };
      }
      return actions.createLot({
        speciesProfileId,
        strain: args.strain as string | undefined,
        sex: args.sex as "mixed" | "male" | "female",
        quantity: Number(args.quantity),
        sourceType: args.sourceType as "internal_birth" | "external_purchase" | "transfer",
        birthDate: args.birthDate ? new Date(String(args.birthDate)) : undefined,
        acquisitionDate: args.acquisitionDate ? new Date(String(args.acquisitionDate)) : undefined,
        cageId: resolved.cageId,
        notes: args.notes as string | undefined,
      });
    }

    case "SUBDIVIDE_LOT":
      if (!resolved.lotId) return { success: false, error: "Lot not resolved" };
      return actions.subdivideLot({
        lotId: resolved.lotId,
        subdivisions: args.subdivisions as Array<{
          sex: "mixed" | "male" | "female";
          quantity: number;
          codeSuffix?: string;
          notes?: string;
        }>,
        notes: args.notes as string | undefined,
      });

    case "MOVE_LOT":
      if (!resolved.lotId || !resolved.toCageId) {
        return { success: false, error: "Lot or destination cage not resolved" };
      }
      return actions.moveLot({
        lotId: resolved.lotId,
        fromCageId: resolved.fromCageId ?? "",
        toCageId: resolved.toCageId,
        quantity: args.quantity as number | undefined,
        notes: args.notes as string | undefined,
      });

    case "ASSIGN_LOT_TO_CAGE":
      if (!resolved.lotId || !resolved.cageId) {
        return { success: false, error: "Lot or cage not resolved" };
      }
      return actions.assignLotToCage({
        lotId: resolved.lotId,
        cageId: resolved.cageId,
        notes: args.notes as string | undefined,
      });

    case "REGISTER_MORTALITY":
      if (!resolved.lotId) return { success: false, error: "Lot not resolved" };
      return actions.registerMortality({
        lotId: resolved.lotId,
        quantity: Number(args.quantity),
        reason: args.reason as string | undefined,
        notes: args.notes as string | undefined,
      });

    case "CREATE_BREEDING_GROUP":
      if (!resolved.maleLotId || !resolved.femaleLotId || !resolved.cageId) {
        return { success: false, error: "Breeding lots or cage not resolved" };
      }
      return actions.createBreedingGroup({
        members: [
          { lotId: resolved.maleLotId, role: "male", quantity: 1 },
          { lotId: resolved.femaleLotId, role: "female", quantity: 1 },
        ],
        cageId: resolved.cageId,
        breedingStrategy: args.breedingStrategy as string | undefined,
        notes: args.notes as string | undefined,
      });

    case "REGISTER_LITTER":
      if (!resolved.breedingGroupId) {
        return { success: false, error: "Breeding group not resolved" };
      }
      if (!resolved.speciesProfileId) {
        return { success: false, error: "Species profile not resolved for litter" };
      }
      return actions.registerLitter({
        breedingGroupId: resolved.breedingGroupId,
        speciesProfileId: resolved.speciesProfileId,
        litterSize: Number(args.litterSize),
        liveBirths: Number(args.liveBirths),
        stillbirths: args.stillbirths as number | undefined,
        birthDate: args.birthDate ? new Date(String(args.birthDate)) : undefined,
        notes: args.notes as string | undefined,
      });

    case "REGISTER_WEANING":
      if (!resolved.litterLotId) {
        return { success: false, error: "Litter lot not resolved" };
      }
      return actions.registerWeaning({
        litterLotId: resolved.litterLotId,
        weaningDate: new Date(String(args.weaningDate)),
        subdivisions: args.subdivisions as Array<{
          sex: "mixed" | "male" | "female";
          quantity: number;
          notes?: string;
        }>,
        notes: args.notes as string | undefined,
      });

    default:
      return { success: false, error: `Unsupported intent: ${op.intent as string}` };
  }
}
