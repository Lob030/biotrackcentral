/**
 * Bioterio Lot Runtime Types
 * 
 * Core type definitions for the lot-centric operational model.
 * 
 * IMPORTANT: This system is LOT-CENTRIC, not individual-animal centric.
 * - Animals are managed in groups (lots)
 * - The lot is the primary operational entity
 * - Subdivision workflows are fundamental
 * - Lineage and traceability persist through lot transformations
 */

/**
 * Lot Status - Represents the current operational state of a lot
 */
export type LotStatus =
  | 'active'       // Lot is currently active and operational
  | 'subdivided'   // Lot has been subdivided into child lots
  | 'sold'         // Lot has been sold/transferred out
  | 'retired'      // Lot is retired from breeding/production
  | 'deceased'     // All animals in lot have deceased;

/**
 * Lot Source Type - Origin of the lot
 */
export type LotSourceType =
  | 'internal_birth'  // Born within the bioterio facility
  | 'external_purchase' // Purchased from external supplier
  | 'transfer';        // Transferred from another facility/lot

/**
 * Sex classification for lots
 */
export type LotSexType =
  | 'mixed'   // Both males and females
  | 'male'    // Males only
  | 'female'; // Females only

/**
 * Species reference - Uses ID reference for flexibility
 * 
 * IMPORTANT: This is a string reference to a Species entity,
 * not a hardcoded enum. This allows:
 * - Custom species definitions
 * - Integration with external species registries
 * - Future expansion without code changes
 */
export type SpeciesId = string;

/**
 * Common species identifiers (for convenience, not required)
 */
export const CommonSpeciesIds: Record<string, SpeciesId> = {
  MOUSE: 'species_mouse',
  RAT: 'species_rat',
  HAMSTER: 'species_hamster',
  GUINEA_PIG: 'species_guinea_pig',
  RABBIT: 'species_rabbit',
  OTHER: 'species_other',
} as const;

/**
 * Lifecycle Event Types - Tracks significant events in a lot's lifecycle
 */
export type LotLifecycleEventType =
  | 'created'           // Lot was created
  | 'subdivided'        // Lot was subdivided
  | 'animals_added'     // Animals were added to the lot
  | 'animals_removed'   // Animals were removed from the lot
  | 'mortality'         // Mortality event occurred
  | 'status_changed'    // Lot status changed
  | 'sold'              // Lot was sold
  | 'retired'           // Lot was retired
  | 'deceased';         // Lot marked as deceased

/**
 * Lifecycle Event - A single event in the lot's history
 */
export interface LotLifecycleEvent {
  id: string;
  lotId: string;
  eventType: LotLifecycleEventType;
  timestamp: Date;
  quantity?: number;      // Quantity affected (if applicable)
  reason?: string;        // Reason for the event
  metadata?: Record<string, unknown>; // Additional context
}

/**
 * Lot Subdivision - Represents a subdivision relationship
 */
export interface LotSubdivision {
  id: string;
  parentLotId: string;    // The original lot that was subdivided
  childLotId: string;     // The new lot created from subdivision
  subdivisionDate: Date;
  quantityAllocated: number; // How many animals were allocated to this child
  sex?: LotSexType;       // Sex of the subdivided lot (if sorted by sex)
  notes?: string;
}

/**
 * Lot Lineage - Tracks the complete ancestry and descent of a lot
 */
export interface LotLineage {
  lotId: string;
  originLotId?: string;   // The lot this originated from (for subdivisions)
  sourceType: LotSourceType;
  subdivisions: LotSubdivision[]; // Child lots created from this lot
  ancestors: string[];    // Chain of ancestor lot IDs (oldest to immediate parent)
  generationDepth: number; // How many generations deep this lot is
}

/**
 * Lot - The primary operational entity in the bioterio
 * 
 * A lot represents a group of animals managed together.
 * Individual animal tracking is NOT part of this model.
 */
export interface Lot {
  // Identity
  id: string;
  code: string;           // Human-readable identifier (e.g., "ASF-001")
  
  // Biological attributes
  speciesId: SpeciesId;   // Reference to species entity (flexible, not hardcoded)
  strain?: string;        // Genetic strain/line (e.g., "C57BL/6", "BALB/c")
  sex: LotSexType;
  
  // Population
  initialQuantity: number; // Original quantity when lot was created
  currentQuantity: number; // Current live count
  
  // Dates
  birthDate?: Date;       // Date of birth (for internal births)
  acquisitionDate?: Date; // Date acquired (for external purchases)
  createdAt: Date;
  updatedAt: Date;
  
  // Origin tracking
  sourceType: LotSourceType;
  originLotId?: string;   // Parent lot ID if from subdivision
  supplierName?: string;  // External supplier (if purchased)
  
  // Operational state
  status: LotStatus;
  location?: string;      // Cage/room location identifier
  sizeClassId?: string;   // Dynamic size classification ID
  sizeClassName?: string; // Dynamic size classification Name (denormalized)
  
  // Lineage reference (denormalized for quick access)
  lineage: LotLineage;
  
  // Metadata
  notes?: string;
  tags?: string[];        // For categorization/search
}

/**
 * Create Lot Options - Parameters for creating a new lot
 */
export interface CreateLotOptions {
  speciesId: SpeciesId;   // Reference to species entity
  strain?: string;
  sex: LotSexType;
  quantity: number;
  sourceType: LotSourceType;
  originLotId?: string;   // Required if sourceType is 'transfer' or subdivision
  birthDate?: Date;
  acquisitionDate?: Date;
  location?: string;
  sizeClassId?: string;   // Initialize with specific size class
  supplierName?: string;
  notes?: string;
  tags?: string[];
}

/**
 * Subdivide Lot Options - Parameters for subdividing a lot
 */
export interface SubdivideLotOptions {
  lotId: string;
  subdivisions: {
    sex: LotSexType;
    quantity: number;
    codeSuffix?: string;  // e.g., "-M", "-F"
    notes?: string;
  }[];
  notes?: string;
}

/**
 * Lot Query Filters - For filtering lots in queries
 */
export interface LotQueryFilters {
  status?: LotStatus | LotStatus[];
  speciesId?: SpeciesId | SpeciesId[];  // Filter by species ID(s)
  sex?: LotSexType | LotSexType[];
  sourceType?: LotSourceType;
  includeSubdivided?: boolean; // Whether to include subdivided lots
}

/**
 * Lot Summary - Lightweight representation for lists/summaries
 */
export interface LotSummary {
  id: string;
  code: string;
  speciesId: SpeciesId;
  sex: LotSexType;
  currentQuantity: number;
  status: LotStatus;
  location?: string;
  sizeClassId?: string;
  sizeClassName?: string;
}
