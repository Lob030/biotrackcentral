/**
 * Bioterio Lot Runtime Types
 *
 * LOT-CENTRIC operational model. Animals are managed as groups (lots);
 * the lot is the primary entity.
 *
 * SPECIES IDENTITY:
 * Lots reference species via `speciesProfileId` — the UUID of a workspace
 * `workspace_species_profiles` row. There are NO string species enums, NO
 * `SpeciesId` aliases, NO hardcoded species unions. All species behavior is
 * resolved at runtime through the `SpeciesRuntimeResolver`.
 */

export type LotStatus =
  | "active"
  | "subdivided"
  | "sold"
  | "retired"
  | "deceased";

export type LotSourceType =
  | "internal_birth"
  | "external_purchase"
  | "transfer";

export type LotSexType = "mixed" | "male" | "female";

/** UUID of a `workspace_species_profiles` row. Always workspace-scoped. */
export type SpeciesProfileId = string;

export type LotLifecycleEventType =
  | "created"
  | "subdivided"
  | "animals_added"
  | "animals_removed"
  | "mortality"
  | "status_changed"
  | "sold"
  | "retired"
  | "deceased";

export interface LotLifecycleEvent {
  id: string;
  lotId: string;
  eventType: LotLifecycleEventType;
  timestamp: Date;
  quantity?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface LotSubdivision {
  id: string;
  parentLotId: string;
  childLotId: string;
  subdivisionDate: Date;
  quantityAllocated: number;
  sex?: LotSexType;
  notes?: string;
}

export interface LotLineage {
  lotId: string;
  originLotId?: string;
  sourceType: LotSourceType;
  subdivisions: LotSubdivision[];
  ancestors: string[];
  generationDepth: number;
}

export interface Lot {
  id: string;
  code: string;

  /** UUID of the workspace species profile. NEVER a string alias. */
  speciesProfileId: SpeciesProfileId;

  strain?: string;
  sex: LotSexType;

  initialQuantity: number;
  currentQuantity: number;

  birthDate?: Date;
  acquisitionDate?: Date;
  createdAt: Date;
  updatedAt: Date;

  sourceType: LotSourceType;
  originLotId?: string;
  supplierName?: string;

  status: LotStatus;
  location?: string;
  sizeClassId?: string;
  sizeClassName?: string;

  lineage: LotLineage;

  notes?: string;
  tags?: string[];
}

export interface CreateLotOptions {
  speciesProfileId: SpeciesProfileId;
  strain?: string;
  sex: LotSexType;
  quantity: number;
  sourceType: LotSourceType;
  originLotId?: string;
  birthDate?: Date;
  acquisitionDate?: Date;
  location?: string;
  sizeClassId?: string;
  supplierName?: string;
  notes?: string;
  tags?: string[];
}

export interface SubdivideLotOptions {
  lotId: string;
  subdivisions: {
    sex: LotSexType;
    quantity: number;
    codeSuffix?: string;
    notes?: string;
  }[];
  notes?: string;
}

export interface LotQueryFilters {
  status?: LotStatus | LotStatus[];
  speciesProfileId?: SpeciesProfileId | SpeciesProfileId[];
  sex?: LotSexType | LotSexType[];
  sourceType?: LotSourceType;
  includeSubdivided?: boolean;
}

export interface LotSummary {
  id: string;
  code: string;
  speciesProfileId: SpeciesProfileId;
  sex: LotSexType;
  currentQuantity: number;
  status: LotStatus;
  location?: string;
  sizeClassId?: string;
  sizeClassName?: string;
}
