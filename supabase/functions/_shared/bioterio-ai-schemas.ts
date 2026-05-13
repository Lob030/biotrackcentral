// Shared schemas + intent registry for the Operational AI Assistant.
// Mirrored on the frontend at src/modules/bioterio/ai/{intents,schemas}.ts.
import { z } from "npm:zod@3.23.8";

export const INTENT_NAMES = [
  "CREATE_LOT",
  "SUBDIVIDE_LOT",
  "MOVE_LOT",
  "ASSIGN_LOT_TO_CAGE",
  "REGISTER_MORTALITY",
  "CREATE_BREEDING_GROUP",
  "REGISTER_LITTER",
  "REGISTER_WEANING",
] as const;

export type IntentName = (typeof INTENT_NAMES)[number];

const code = z.string().trim().min(1).max(80);
const qty = z.number().int().positive().max(100_000);
const sex = z.enum(["mixed", "male", "female"]);
const sourceType = z.enum(["internal_birth", "external_purchase", "transfer"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const IntentSchemas = {
  CREATE_LOT: z.object({
    speciesId: z.string().trim().min(1).max(60),
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
    subdivisions: z.array(z.object({
      sex,
      quantity: qty,
      codeSuffix: z.string().trim().max(10).optional(),
      notes: z.string().trim().max(200).optional(),
    })).min(1).max(10),
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
    subdivisions: z.array(z.object({
      sex,
      quantity: qty,
      notes: z.string().trim().max(200).optional(),
    })).min(1).max(10),
    notes: z.string().trim().max(500).optional(),
  }),
} as const;

// JSON-schema parameter blocks for tool calling.
export const TOOL_PARAMS: Record<IntentName, Record<string, unknown>> = {
  CREATE_LOT: {
    type: "object",
    properties: {
      speciesId: { type: "string" },
      strain: { type: "string" },
      sex: { type: "string", enum: ["mixed", "male", "female"] },
      quantity: { type: "integer", minimum: 1 },
      sourceType: { type: "string", enum: ["internal_birth", "external_purchase", "transfer"] },
      birthDate: { type: "string", description: "YYYY-MM-DD" },
      cageCode: { type: "string" },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["speciesId", "sex", "quantity", "sourceType", "confidence"],
  },
  SUBDIVIDE_LOT: {
    type: "object",
    properties: {
      lotCode: { type: "string" },
      subdivisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sex: { type: "string", enum: ["mixed", "male", "female"] },
            quantity: { type: "integer", minimum: 1 },
            codeSuffix: { type: "string" },
          },
          required: ["sex", "quantity"],
        },
      },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["lotCode", "subdivisions", "confidence"],
  },
  MOVE_LOT: {
    type: "object",
    properties: {
      lotCode: { type: "string" },
      targetCageCode: { type: "string" },
      quantity: { type: "integer", minimum: 1 },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["lotCode", "targetCageCode", "confidence"],
  },
  ASSIGN_LOT_TO_CAGE: {
    type: "object",
    properties: {
      lotCode: { type: "string" },
      cageCode: { type: "string" },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["lotCode", "cageCode", "confidence"],
  },
  REGISTER_MORTALITY: {
    type: "object",
    properties: {
      lotCode: { type: "string" },
      quantity: { type: "integer", minimum: 1 },
      reason: { type: "string" },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["lotCode", "quantity", "confidence"],
  },
  CREATE_BREEDING_GROUP: {
    type: "object",
    properties: {
      maleLotCode: { type: "string" },
      femaleLotCode: { type: "string" },
      cageCode: { type: "string" },
      breedingStrategy: { type: "string" },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["maleLotCode", "femaleLotCode", "cageCode", "confidence"],
  },
  REGISTER_LITTER: {
    type: "object",
    properties: {
      breedingGroupRef: { type: "string" },
      litterSize: { type: "integer", minimum: 1 },
      liveBirths: { type: "integer", minimum: 1 },
      stillbirths: { type: "integer", minimum: 0 },
      birthDate: { type: "string" },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["breedingGroupRef", "litterSize", "liveBirths", "confidence"],
  },
  REGISTER_WEANING: {
    type: "object",
    properties: {
      litterLotCode: { type: "string" },
      weaningDate: { type: "string" },
      subdivisions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sex: { type: "string", enum: ["mixed", "male", "female"] },
            quantity: { type: "integer", minimum: 1 },
          },
          required: ["sex", "quantity"],
        },
      },
      notes: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["litterLotCode", "weaningDate", "subdivisions", "confidence"],
  },
};
