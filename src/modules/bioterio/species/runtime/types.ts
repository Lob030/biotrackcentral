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
