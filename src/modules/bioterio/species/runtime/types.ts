/**
 * Workspace Species Profiles Runtime Types
 * 
 * Core type definitions for the workspace-species operational configuration system.
 * 
 * CRITICAL PRINCIPLES:
 * - Species are NOT hardcoded operational behavior
 * - Each workspace can customize classifications, sizes, weights, ages, pricing
 * - Built-in species (ASF, Rat, Mouse) are starter blueprints, not immutable definitions
 * - Species Profiles are WORKSPACE-SCOPED
 * - Operational entities reference sizeClassId, NOT size names as strings
 */

// ============================================================================
// CORE ENTITY TYPES
// ============================================================================

/**
 * Operational Quantity Unit
 * 
 * Defines the unit of measurement used for lot quantities.
 * This abstracts operations away from assuming "individuals".
 */
export type OperationalQuantityUnit =
  | 'individuals'
  | 'grams'
  | 'kilograms'
  | 'colonies'
  | 'trays'
  | 'containers'
  | 'liters';

/**
 * Species Runtime Capability Profile
 * 
 * Defines the operational capabilities supported by a specific species.
 * Used to dynamically adapt dashboards, workflows, and validations.
 */
export interface SpeciesRuntimeCapabilityProfile {
  operationalQuantityUnit: OperationalQuantityUnit;
  reproductionMode: 'isolated_pairs' | 'harem_groups' | 'mass_colony' | 'batch_cycle' | 'none';
  subdivisionMode: 'sex_separated' | 'weight_graded' | 'random_split' | 'none';
  occupancyMode: 'individual_count' | 'biomass_density' | 'container_count';
  forecastingMode: 'discrete_timeline' | 'continuous_flow' | 'batch_harvest';
}


/**
 * Workspace Species Profile
 * 
 * The main entity that defines how a workspace operationally manages a species.
 * This is workspace-scoped - different bioterios can configure the same biological
 * species differently.
 */
export interface WorkspaceSpeciesProfile {
  // Identity
  id: string;
  workspaceId: string;
  
  // Species reference
  speciesId: string;           // Biological species identifier (e.g., 'mus_musculus')
  speciesName: string;         // Display name (e.g., 'Mouse', 'Rat', 'Hamster')
  scientificName?: string;     // Scientific name (e.g., 'Mus musculus')
  
  // Operational configuration
  operationalName: string;     // How this workspace refers to this species operationally
  description?: string;
  
  // Status
  isActive: boolean;
  isCustom: boolean;           // true if created by workspace (false = starter blueprint)
  isStarterBlueprint: boolean; // true if based on built-in starter blueprint
  
  // Capabilities
  capabilities: SpeciesRuntimeCapabilityProfile;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * Species Size Class
 * 
 * Defines an operational size classification for a species within a workspace.
 * 
 * EXAMPLE:
 * Workspace A might use: Pinky, Fuzzy, Hopper
 * Workspace B might use: 10g, 20g, 50g, Adult
 * 
 * Both are valid for the same biological species.
 */
export interface SpeciesSizeClass {
  // Identity
  id: string;
  workspaceId: string;
  speciesProfileId: string;    // Reference to WorkspaceSpeciesProfile
  
  // Classification
  name: string;                // Operational name (e.g., 'Pinky', '20g', 'Adult')
  code?: string;               // Short code for internal use (e.g., 'PK', '20G', 'AD')
  
  // Weight range (grams)
  minWeightGrams?: number;
  maxWeightGrams?: number;
  
  // Age range (days)
  minAgeDays?: number;
  maxAgeDays?: number;
  
  // Pricing
  salePrice?: number;          // Default sale price for this size class
  costPrice?: number;          // Internal cost basis
  
  // Ordering
  displayOrder: number;        // For UI ordering/sorting
  
  // Status flags
  isActive: boolean;
  isDefault: boolean;          // Default size class for this species
  isCustom: boolean;           // true if workspace-defined (false = from blueprint)
  
  // Metadata
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Species Operational Settings
 * 
 * Defines operational parameters for managing a species in a workspace.
 */
export interface SpeciesOperationalSettings {
  // Identity
  id: string;
  workspaceId: string;
  speciesProfileId: string;
  
  // Breeding parameters
  breedingCycleDays: number;           // Expected breeding cycle length
  expectedWeaningAgeDays: number;      // Typical weaning age
  expectedGestationDays: number;       // Gestation period
  maturityAgeDays: number;             // Age at sexual maturity
  
  // Growth parameters
  expectedBirthWeightGrams: number;    // Average birth weight
  expectedAdultWeightGrams: number;    // Average adult weight
  
  // Mortality expectations
  expectedMortalityRate: number;       // Expected mortality rate (0-1)
  
  // Growth curve reference
  expectedGrowthCurve?: string;        // Reference to growth curve data
  
  // Operational defaults
  defaultSexRatio?: number;            // Expected M:F ratio
  typicalLitterSize?: number;          // Average litter size
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Growth Classification
 * 
 * Maps weight/age measurements to size classes.
 * Used for runtime classification of lots/animals.
 */
export interface GrowthClassification {
  // Identity
  id: string;
  workspaceId: string;
  speciesProfileId: string;
  sizeClassId: string;
  
  // Classification criteria
  weightRangeGrams: {
    min?: number;
    max?: number;
  };
  ageRangeDays: {
    min?: number;
    max?: number;
  };
  
  // Priority (for overlapping ranges)
  priority: number;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Species Pricing Profile
 * 
 * Defines pricing rules and tiers for a species in a workspace.
 */
export interface SpeciesPricingProfile {
  // Identity
  id: string;
  workspaceId: string;
  speciesProfileId: string;
  
  // Pricing configuration
  basePrice: number;
  currency: string;
  
  // Size class pricing overrides
  sizeClassPricing: {
    sizeClassId: string;
    price: number;
    costBasis?: number;
    marginPercent?: number;
  }[];
  
  // Volume discounts
  volumeDiscounts: {
    minQuantity: number;
    discountPercent: number;
  }[];
  
  // Customer tier pricing
  customerTierPricing: {
    tierId: string;
    discountPercent: number;
  }[];
  
  // Temporal pricing
  effectiveFrom?: Date;
  effectiveTo?: Date;
  
  // Status
  isActive: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STARTER BLUEPRINT DEFINITIONS
// ============================================================================

/**
 * Starter Blueprint for ASF (African Soft-Furred Rat)
 * 
 * This is an EDITABLE TEMPLATE, not an immutable definition.
 * Workspaces can modify, rename, delete, or extend all values.
 */
export const ASF_STARTER_BLUEPRINT: WorkspaceSpeciesProfile = {
  id: 'starter_asf',
  workspaceId: '', // Will be set when instantiated
  speciesId: 'mastomys_natalensis',
  speciesName: 'ASF',
  scientificName: 'Mastomys natalensis',
  operationalName: 'ASF',
  description: 'African Soft-Furred Rat - starter blueprint',
  isActive: true,
  isCustom: false,
  isStarterBlueprint: true,
  capabilities: {
    operationalQuantityUnit: 'individuals',
    reproductionMode: 'harem_groups',
    subdivisionMode: 'sex_separated',
    occupancyMode: 'individual_count',
    forecastingMode: 'discrete_timeline',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Default ASF Size Classes (starter blueprint)
 */
export const ASF_DEFAULT_SIZE_CLASSES: Omit<SpeciesSizeClass, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    workspaceId: '',
    speciesProfileId: '',
    name: 'Pinky',
    code: 'PK',
    minWeightGrams: 3,
    maxWeightGrams: 10,
    minAgeDays: 0,
    maxAgeDays: 7,
    salePrice: 2.50,
    displayOrder: 1,
    isActive: true,
    isDefault: false,
    isCustom: false,
    description: 'Newborn to 7 days',
  },
  {
    workspaceId: '',
    speciesProfileId: '',
    name: 'Fuzzy',
    code: 'FZ',
    minWeightGrams: 10,
    maxWeightGrams: 20,
    minAgeDays: 7,
    maxAgeDays: 14,
    salePrice: 3.00,
    displayOrder: 2,
    isActive: true,
    isDefault: false,
    isCustom: false,
    description: '7 to 14 days',
  },
  {
    workspaceId: '',
    speciesProfileId: '',
    name: 'Hopper',
    code: 'HP',
    minWeightGrams: 20,
    maxWeightGrams: 40,
    minAgeDays: 14,
    maxAgeDays: 21,
    salePrice: 4.00,
    displayOrder: 3,
    isActive: true,
    isDefault: false,
    isCustom: false,
    description: '14 to 21 days',
  },
  {
    workspaceId: '',
    speciesProfileId: '',
    name: 'Adult',
    code: 'AD',
    minWeightGrams: 40,
    maxWeightGrams: 80,
    minAgeDays: 21,
    maxAgeDays: undefined,
    salePrice: 5.00,
    displayOrder: 4,
    isActive: true,
    isDefault: true,
    isCustom: false,
    description: '21+ days, mature',
  },
];

/**
 * Default ASF Operational Settings (starter blueprint)
 */
export const ASF_DEFAULT_OPERATIONAL_SETTINGS: Omit<SpeciesOperationalSettings, 'id' | 'workspaceId' | 'speciesProfileId' | 'createdAt' | 'updatedAt'> = {
  breedingCycleDays: 4,
  expectedWeaningAgeDays: 21,
  expectedGestationDays: 23,
  maturityAgeDays: 42,
  expectedBirthWeightGrams: 3,
  expectedAdultWeightGrams: 60,
  expectedMortalityRate: 0.05,
  expectedGrowthCurve: 'asf_standard',
  defaultSexRatio: 1.0,
  typicalLitterSize: 8,
};

// ============================================================================
// TENEBRIO MOLITOR STARTER BLUEPRINT
// ============================================================================

/**
 * Starter Blueprint for Tenebrio molitor (Mealworm / Superworm colony)
 *
 * KEY DIFFERENCES FROM MAMMAL BLUEPRINTS:
 * - operationalQuantityUnit: 'grams' — managed by MASS, not individual count
 * - subdivisionMode: 'weight_graded' — no sex subdivision (mass-based splits)
 * - occupancyMode: 'biomass_density' — measured in grams per container
 * - reproductionMode: 'mass_colony' — colony-level reproduction, not pair/harem
 * - forecastingMode: 'batch_harvest' — harvest-based projections
 *
 * All quantity labels (dashboard, projections, inventory, AI) MUST use grams.
 */
export const TENEBRIO_STARTER_BLUEPRINT: WorkspaceSpeciesProfile = {
  id: 'starter_tenebrio',
  workspaceId: '', // Set at workspace instantiation
  speciesId: 'tenebrio_molitor',
  speciesName: 'Tenebrios',
  scientificName: 'Tenebrio molitor',
  operationalName: 'Tenebrios',
  description: 'Colonia de Tenebrio molitor — Gestión por masa en gramos. Sin separación por sexo.',
  isActive: true,
  isCustom: false,
  isStarterBlueprint: true,
  capabilities: {
    operationalQuantityUnit: 'grams',
    reproductionMode: 'mass_colony',
    subdivisionMode: 'weight_graded',
    occupancyMode: 'biomass_density',
    forecastingMode: 'batch_harvest',
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Default Tenebrio Size Classes (starter blueprint)
 *
 * These are EDITABLE workspace-specific records, not constants.
 * Weights represent total lot mass sold, not individual animal weight.
 * Prices are in MXN and are fully editable per workspace.
 */
export const TENEBRIO_DEFAULT_SIZE_CLASSES: Omit<SpeciesSizeClass, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    workspaceId: '',
    speciesProfileId: '',
    name: '100 gramos',
    code: '100G',
    minWeightGrams: 100,
    maxWeightGrams: 100,
    salePrice: 140,
    displayOrder: 1,
    isActive: true,
    isDefault: false,
    isCustom: false,
    description: 'Presentación de 100 g',
  },
  {
    workspaceId: '',
    speciesProfileId: '',
    name: '250 gramos',
    code: '250G',
    minWeightGrams: 250,
    maxWeightGrams: 250,
    salePrice: 250,
    displayOrder: 2,
    isActive: true,
    isDefault: true,
    isCustom: false,
    description: 'Presentación de 250 g',
  },
  {
    workspaceId: '',
    speciesProfileId: '',
    name: '500 gramos',
    code: '500G',
    minWeightGrams: 500,
    maxWeightGrams: 500,
    salePrice: 450,
    displayOrder: 3,
    isActive: true,
    isDefault: false,
    isCustom: false,
    description: 'Presentación de 500 g',
  },
  {
    workspaceId: '',
    speciesProfileId: '',
    name: '1 kilo',
    code: '1KG',
    minWeightGrams: 1000,
    maxWeightGrams: 1000,
    salePrice: 800,
    displayOrder: 4,
    isActive: true,
    isDefault: false,
    isCustom: false,
    description: 'Presentación de 1 kg',
  },
];

/**
 * Default Tenebrio Operational Settings (starter blueprint)
 *
 * These values model the colony-level lifecycle, not individual insects.
 * breedingCycleDays: approx. time from egg to harvestable larvae under managed conditions.
 */
export const TENEBRIO_DEFAULT_OPERATIONAL_SETTINGS: Omit<SpeciesOperationalSettings, 'id' | 'workspaceId' | 'speciesProfileId' | 'createdAt' | 'updatedAt'> = {
  breedingCycleDays: 60,        // Egg to harvestable larva: ~60 days
  expectedWeaningAgeDays: 0,    // Not applicable for insects
  expectedGestationDays: 10,    // Egg incubation period
  maturityAgeDays: 60,          // Larvae reach harvestable mass
  expectedBirthWeightGrams: 0,  // Not tracked individually
  expectedAdultWeightGrams: 0,  // Not tracked individually
  expectedMortalityRate: 0.10,  // ~10% colony loss expected
  expectedGrowthCurve: 'tenebrio_mass_colony',
  defaultSexRatio: undefined,   // Sex ratio not managed
  typicalLitterSize: undefined, // Not applicable
};

// ============================================================================
// QUERY AND FILTER TYPES
// ============================================================================

/**
 * Filters for querying species profiles
 */
export interface SpeciesProfileFilters {
  workspaceId: string;
  speciesId?: string | string[];
  isActive?: boolean;
  includeInactive?: boolean;
  includeBlueprints?: boolean;
}

/**
 * Filters for querying size classes
 */
export interface SizeClassFilters {
  workspaceId: string;
  speciesProfileId: string;
  isActive?: boolean;
  includeInactive?: boolean;
}

/**
 * Classification result
 */
export interface ClassificationResult {
  sizeClassId: string;
  sizeClassName: string;
  matchedBy: 'weight' | 'age' | 'both';
  confidence: 'exact' | 'range' | 'fallback';
}

/**
 * Validation error for species configuration
 */
export interface SpeciesConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  details?: Record<string, unknown>;
}

/**
 * Validation result for species configuration
 */
export interface SpeciesConfigValidationResult {
  isValid: boolean;
  errors: SpeciesConfigValidationError[];
  warnings: SpeciesConfigValidationError[];
}
