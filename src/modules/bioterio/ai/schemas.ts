/**
 * Zod schemas for AI intents.
 *
 * Species reference is `speciesProfileId` (UUID) plus optional `speciesName`
 * (the user-spoken display string used purely for the resolver to suggest
 * disambiguation candidates — never used in execution logic).
 */
import { z } from "zod";
import type { IntentName } from "./intents";

const code = z.string().trim().min(1).max(80);
const qty = z.number().int().positive().max(100_000);
const sex = z.enum(["mixed", "male", "female"]);
const sourceType = z.enum(["internal_birth", "external_purchase", "transfer"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const uuid = z.string().uuid();

export const IntentSchemas = {
  CREATE_LOT: z.object({
    speciesProfileId: uuid,
    speciesName: z.string().trim().max(120).optional(),
    strain: z.string().trim().max(120).optional(),
    sex,
    quantity: qty,
    sourceType,
    birthDate: isoDate.optional(),
    acquisitionDate: isoDate.optional(),
    cageCode: code.optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  SUBDIVIDE_LOT: z.object({
    lotCode: code,
    subdivisions: z
      .array(
        z.object({
          sex,
          quantity: qty,
          codeSuffix: z.string().trim().max(10).optional(),
          notes: z.string().trim().max(200).optional(),
        }),
      )
      .min(1)
      .max(10),
    notes: z.string().trim().max(500).optional(),
  }),
  MOVE_LOT: z.object({
    lotCode: code,
    targetCageCode: code,
    quantity: qty.optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  ASSIGN_LOT_TO_CAGE: z.object({
    lotCode: code,
    cageCode: code,
    notes: z.string().trim().max(500).optional(),
  }),
  REGISTER_MORTALITY: z.object({
    lotCode: code,
    quantity: qty,
    reason: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  CREATE_BREEDING_GROUP: z.object({
    maleLotCode: code,
    femaleLotCode: code,
    cageCode: code,
    breedingStrategy: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  REGISTER_LITTER: z.object({
    breedingGroupRef: z.string().trim().min(1).max(80),
    litterSize: qty,
    liveBirths: qty,
    stillbirths: z.number().int().nonnegative().max(100_000).optional(),
    birthDate: isoDate.optional(),
    notes: z.string().trim().max(500).optional(),
  }),
  REGISTER_WEANING: z.object({
    litterLotCode: code,
    weaningDate: isoDate,
    subdivisions: z
      .array(
        z.object({
          sex,
          quantity: qty,
          notes: z.string().trim().max(200).optional(),
        }),
      )
      .min(1)
      .max(10),
    notes: z.string().trim().max(500).optional(),
  }),
} as const satisfies Record<IntentName, z.ZodTypeAny>;

export type IntentArgs<I extends IntentName> = z.infer<(typeof IntentSchemas)[I]>;
