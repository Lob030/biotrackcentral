/**
 * Allowed Operational Intents (closed set).
 * Each maps 1:1 to an existing workflow in src/modules/bioterio/workflows.
 * The AI cannot emit anything outside this catalog.
 */

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

export const INTENT_LABELS: Record<IntentName, string> = {
  CREATE_LOT: "Crear lote",
  SUBDIVIDE_LOT: "Subdividir lote",
  MOVE_LOT: "Mover lote",
  ASSIGN_LOT_TO_CAGE: "Asignar lote a caja",
  REGISTER_MORTALITY: "Registrar mortalidad",
  CREATE_BREEDING_GROUP: "Crear grupo reproductor",
  REGISTER_LITTER: "Registrar camada",
  REGISTER_WEANING: "Registrar destete",
};

export const DESTRUCTIVE_INTENTS: ReadonlySet<IntentName> = new Set<IntentName>([
  "REGISTER_MORTALITY",
  "SUBDIVIDE_LOT",
  "REGISTER_WEANING",
]);

export type Confidence = "high" | "medium" | "low";

export type PlanStatus = "ok" | "needs_disambiguation" | "invalid";
