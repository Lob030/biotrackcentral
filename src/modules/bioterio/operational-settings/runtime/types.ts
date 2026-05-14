/**
 * Operational Settings Runtime Types
 * 
 * This is the OPERATIONAL INTELLIGENCE LAYER for the Bioterio ecosystem.
 * 
 * ARCHITECTURE:
 *   Species Runtime Profiles → define WHAT exists
 *   Operational Settings    → define HOW it behaves operationally
 * 
 * CRITICAL PRINCIPLES:
 * - Settings are WORKSPACE-SCOPED (same species, different behavior per bioterio)
 * - Settings attach to Species Runtime Instances, NOT global species definitions
 * - All models are SPECIES-AGNOSTIC (rodents, insects, amphibians, aquatics)
 * - No hardcoded biology assumptions (individuals, male/female, etc.)
 * - Quantity operations respect the Species Runtime's OperationalQuantityUnit
 */

import type { OperationalQuantityUnit } from '../../species/runtime/types';

// ============================================================================
// GROWTH MODELS
// ============================================================================

/**
 * Growth Model Type
 * 
 * Determines how organisms in this species runtime are expected to grow.
 * The forecasting engine uses this to project future availability.
 */
export type GrowthModelType =
  | 'linear_growth'       // Steady weight/size gain over time (simple)
  | 'staged_growth'       // Discrete stages: Pinky → Fuzzy → Hopper → Adult
  | 'curve_growth'        // Sigmoid or custom growth curve
  | 'colony_expansion'    // Colony grows via population/mass expansion
  | 'production_cycle';   // Cyclical production (e.g., egg-laying, molting)

export interface GrowthModel {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  type: GrowthModelType;

  /**
   * Expected daily growth rate.
   * Unit depends on the species' OperationalQuantityUnit:
   * - individuals: n/a (use staged classification instead)
   * - grams: grams/day per individual or colony
   * - colonies: expansion rate
   */
  dailyGrowthRate?: number;
  growthRateUnit?: OperationalQuantityUnit;

  /**
   * For staged_growth: the ordered sequence of classification stages
   * Each stage references a SpeciesSizeClass.id
   */
  stageProgression?: {
    sizeClassId: string;
    expectedDurationDays: number;  // How long this stage lasts
    expectedEntryWeight?: number;  // Weight at entry to this stage
    expectedExitWeight?: number;   // Weight at exit from this stage
  }[];

  /**
   * For curve_growth: curve parameters
   */
  curveParams?: {
    asymptote: number;     // Maximum expected weight/size
    inflectionDay: number; // Day of fastest growth
    steepness: number;     // Growth curve steepness (k factor)
  };

  /** For colony_expansion: doubling time in days */
  doublingTimeDays?: number;

  /** For production_cycle: cycle length in days */
  productionCycleDays?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MORTALITY MODELS
// ============================================================================

/**
 * Mortality Model Type
 * 
 * Determines how mortality is expected to behave for forecasting/projections.
 */
export type MortalityModelType =
  | 'fixed_rate'        // Constant daily/weekly mortality rate
  | 'stage_based'       // Different rates per classification stage
  | 'environmental'     // Mortality influenced by environmental factors
  | 'colony_decay';     // Colony-level decline rate

export interface MortalityModel {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  type: MortalityModelType;

  /** For fixed_rate: daily mortality fraction (0-1) */
  dailyMortalityRate?: number;

  /** For stage_based: mortality rate per classification stage */
  stageMortalityRates?: {
    sizeClassId: string;
    dailyRate: number;         // Expected daily mortality for this stage
    cumulativeExpected: number; // Expected total loss through this stage (0-1)
  }[];

  /** For colony_decay: daily colony decay fraction */
  colonyDecayRate?: number;

  /** For environmental: sensitivity multiplier */
  environmentalSensitivity?: number;

  /**
   * Acceptable variance before triggering alerts.
   * e.g., 0.20 means 20% above expected triggers a warning.
   */
  alertVarianceThreshold: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// BREEDING MODELS
// ============================================================================

/**
 * Breeding Model Type
 * 
 * Determines the reproductive strategy for production forecasting.
 */
export type BreedingModelType =
  | 'pair_based'       // 1:1 male:female pairings
  | 'harem_based'      // 1:N male:female ratios
  | 'colony_based'     // Colony-level reproduction (insects)
  | 'cycle_based'      // Timed production cycles (avian, aquatic)
  | 'isolated_groups'; // Isolated breeding groups with tracked lineage

export interface BreedingModel {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  type: BreedingModelType;

  /** Gestation/incubation period in days */
  gestationDays: number;

  /** Time between successful breeding events (days) */
  breedingIntervalDays: number;

  /** Expected offspring per event (litter size, eggs, colony fission output) */
  expectedOffspringPerEvent: number;
  offspringVariance?: number; // Standard deviation around expectedOffspring

  /** Weaning/independence age in days */
  weaningAgeDays?: number;

  /** Maturity age (eligible for breeding) in days */
  maturityAgeDays: number;

  /** For harem_based: recommended male-to-female ratio */
  recommendedMaleToFemaleRatio?: number;

  /** For colony_based: minimum colony size for reproduction */
  minimumColonySizeForReproduction?: number;

  /** Maximum productive lifespan in days (after which retirement is recommended) */
  maxProductiveLifespanDays?: number;

  /** Breeding success rate (0-1) — not every pairing produces offspring */
  breedingSuccessRate?: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// CLASSIFICATION PROGRESSION MODEL
// ============================================================================

/**
 * Classification Progression Model
 * 
 * Defines how organisms progress through classification stages over time.
 * This is the bridge between GrowthModel and the SpeciesSizeClass system.
 * 
 * Examples:
 *   Pinky → Fuzzy → Hopper → Adult
 *   Micro → Small → Medium → Large
 *   Colony A → Colony B → Production Colony
 */
export interface ClassificationProgressionModel {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  /** Ordered list of stages (first = youngest/smallest, last = mature) */
  stages: ClassificationStage[];

  /** Method for determining stage transition */
  transitionMethod: 'age_based' | 'weight_based' | 'manual' | 'hybrid';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassificationStage {
  /** Reference to SpeciesSizeClass.id */
  sizeClassId: string;

  /** Display order in progression */
  order: number;

  /** Minimum age (days) to enter this stage */
  minAgeDays?: number;

  /** Maximum age (days) before progressing to next stage */
  maxAgeDays?: number;

  /** Minimum weight (in species' quantity unit) to enter this stage */
  minWeight?: number;
  maxWeight?: number;

  /** Expected duration in this stage (days) */
  expectedDurationDays?: number;

  /** Is this the terminal/final stage? */
  isTerminal: boolean;
}

// ============================================================================
// FORECASTING CONFIGURATION
// ============================================================================

/**
 * Forecasting Configuration
 * 
 * Controls how the projection engine calculates future availability,
 * production, and operational outcomes.
 */
export interface ForecastingConfiguration {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  /** How far into the future to project (days) */
  projectionWindowDays: number;

  /** Confidence level for projections (0-1). e.g., 0.85 = 85% confidence */
  confidenceLevel: number;

  /** How heavily mortality impacts projections (0-1 multiplier) */
  mortalityInfluenceFactor: number;

  /** Growth acceleration/deceleration factor (1.0 = normal) */
  growthAccelerationFactor: number;

  /** Breeding variability factor (1.0 = use model as-is) */
  breedingVariabilityFactor: number;

  /** Enable/disable environmental influence on projections */
  includeEnvironmentalFactors: boolean;

  /** Minimum stock level to trigger restocking alerts */
  minimumStockAlertThreshold: number;

  /** Granularity for projection intervals */
  projectionGranularity: 'daily' | 'weekly' | 'biweekly' | 'monthly';

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OPERATIONAL THRESHOLDS
// ============================================================================

/**
 * Operational Thresholds
 * 
 * Defines the operational boundaries and alert triggers for a species runtime.
 * These thresholds drive the alert system and AI recommendations.
 */
export interface OperationalThresholds {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  /** Cage/container occupancy threshold (0-1). Above this = overcrowding alert */
  overcrowdingThreshold: number;

  /** Mortality rate above which a warning is triggered (0-1 per period) */
  mortalityWarningThreshold: number;

  /** Days of breeding inactivity before alerting */
  breedingInactivityDays: number;

  /** Minimum available stock per size class before shortage alert */
  availabilityMinimums: {
    sizeClassId: string;
    minimumQuantity: number;
  }[];

  /** Days without environmental readings before quarantine trigger */
  quarantineInactivityDays?: number;

  /** Maximum age (days) before retirement recommendation */
  maxAgeDaysBeforeRetirement?: number;

  /** Weight deviation percentage that triggers growth concern alert */
  growthDeviationAlertPercent: number;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ENVIRONMENTAL CONFIGURATION
// ============================================================================

/**
 * Environmental Configuration
 * 
 * Models expected environmental conditions for the species runtime.
 * This is NOT IoT/sensor integration — it defines operational targets.
 */
export interface EnvironmentalConfiguration {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  /** Temperature range (°C) */
  optimalTemperature: { min: number; max: number };
  criticalTemperature: { min: number; max: number };

  /** Humidity range (%) */
  optimalHumidity: { min: number; max: number };

  /** Lighting cycle (hours) */
  lightCycleHours: { light: number; dark: number };

  /** Environmental sensitivity rating (1-10) — impacts mortality/growth models */
  environmentalSensitivityRating: number;

  /** Notes about special environmental needs */
  specialRequirements?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OPERATIONAL ALERT RULES
// ============================================================================

/**
 * Operational Alert Severity
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Operational Alert Category
 */
export type AlertCategory =
  | 'projected_shortage'
  | 'mortality_spike'
  | 'delayed_growth'
  | 'breeding_inactivity'
  | 'occupancy_overload'
  | 'environmental_deviation'
  | 'retirement_recommendation'
  | 'custom';

/**
 * Operational Alert Rule
 * 
 * Defines conditions under which operational alerts are triggered.
 * Consumed by the dashboard alert system and the AI runtime.
 */
export interface OperationalAlertRule {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  /** Alert categorization */
  category: AlertCategory;
  severity: AlertSeverity;

  /** Human-readable rule name */
  name: string;
  description?: string;

  /** Is this rule currently active? */
  isActive: boolean;

  /** Cooldown period between repeated alerts (hours) */
  cooldownHours: number;

  /** Should this alert trigger AI analysis? */
  triggerAiAnalysis: boolean;

  /** Condition parameters (category-specific) */
  condition: {
    /** The metric to evaluate */
    metric: string;
    /** Comparison operator */
    operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'deviation_percent';
    /** Threshold value */
    value: number;
    /** Evaluation window in days */
    windowDays?: number;
    /** Optional: limit to specific size class */
    sizeClassId?: string;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// OPERATIONAL SETTINGS PROFILE (COMPOSITE)
// ============================================================================

/**
 * Operational Settings Profile
 * 
 * The master composite entity that aggregates all operational behavior models
 * for a single Species Runtime Instance within a workspace.
 * 
 * This is what dashboards, AI, and projection engines consume.
 */
export interface OperationalSettingsProfile {
  id: string;
  workspaceId: string;
  speciesProfileId: string;

  /** Growth behavior model */
  growthModel: GrowthModel;

  /** Mortality expectation model */
  mortalityModel: MortalityModel;

  /** Breeding/reproduction model */
  breedingModel: BreedingModel;

  /** Classification stage progression */
  classificationProgression: ClassificationProgressionModel;

  /** Forecasting engine configuration */
  forecastingConfig: ForecastingConfiguration;

  /** Operational boundary thresholds */
  thresholds: OperationalThresholds;

  /** Environmental target configuration */
  environmentalConfig: EnvironmentalConfiguration;

  /** Active alert rules for this species runtime */
  alertRules: OperationalAlertRule[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROJECTION RESULT TYPES
// ============================================================================

/**
 * Growth Projection Result
 */
export interface GrowthProjectionResult {
  speciesProfileId: string;
  projectedAt: Date;
  points: {
    date: Date;
    projectedWeight?: number;
    projectedSizeClassId?: string;
    projectedSizeClassName?: string;
    confidence: number;
  }[];
}

/**
 * Availability Projection Result
 */
export interface AvailabilityProjectionResult {
  speciesProfileId: string;
  projectedAt: Date;
  projections: {
    date: Date;
    sizeClassId: string;
    sizeClassName: string;
    projectedQuantity: number;
    quantityUnit: OperationalQuantityUnit;
    confidence: number;
  }[];
}

/**
 * Breeding Output Projection Result
 */
export interface BreedingOutputProjectionResult {
  speciesProfileId: string;
  projectedAt: Date;
  events: {
    expectedDate: Date;
    expectedOffspring: number;
    quantityUnit: OperationalQuantityUnit;
    breedingGroupId?: string;
    confidence: number;
  }[];
  totalProjectedOffspring: number;
}

/**
 * Mortality Projection Result
 */
export interface MortalityProjectionResult {
  speciesProfileId: string;
  projectedAt: Date;
  points: {
    date: Date;
    projectedLosses: number;
    quantityUnit: OperationalQuantityUnit;
    cumulativeLosses: number;
    remainingQuantity: number;
    confidence: number;
  }[];
}

/**
 * Classification Progression Estimate
 */
export interface ClassificationProgressionEstimate {
  speciesProfileId: string;
  lotId: string;
  currentSizeClassId: string;
  projectedProgressions: {
    toSizeClassId: string;
    toSizeClassName: string;
    estimatedDate: Date;
    confidence: number;
  }[];
}

// ============================================================================
// STARTER BLUEPRINT DEFAULTS
// ============================================================================

/**
 * Default ASF Operational Settings Profile (starter)
 * 
 * This provides sensible defaults for an ASF bioterio.
 * All values are editable per workspace.
 */
export const ASF_OPERATIONAL_DEFAULTS = {
  growthModel: {
    type: 'staged_growth' as GrowthModelType,
    dailyGrowthRate: 2.5,
    stageProgression: [
      { sizeClassId: 'starter_asf_pinky', expectedDurationDays: 7, expectedEntryWeight: 3, expectedExitWeight: 10 },
      { sizeClassId: 'starter_asf_fuzzy', expectedDurationDays: 7, expectedEntryWeight: 10, expectedExitWeight: 20 },
      { sizeClassId: 'starter_asf_hopper', expectedDurationDays: 7, expectedEntryWeight: 20, expectedExitWeight: 40 },
      { sizeClassId: 'starter_asf_adult', expectedDurationDays: undefined, expectedEntryWeight: 40, expectedExitWeight: 80 },
    ],
  },
  mortalityModel: {
    type: 'stage_based' as MortalityModelType,
    alertVarianceThreshold: 0.20,
    stageMortalityRates: [
      { sizeClassId: 'starter_asf_pinky', dailyRate: 0.01, cumulativeExpected: 0.07 },
      { sizeClassId: 'starter_asf_fuzzy', dailyRate: 0.005, cumulativeExpected: 0.035 },
      { sizeClassId: 'starter_asf_hopper', dailyRate: 0.002, cumulativeExpected: 0.014 },
      { sizeClassId: 'starter_asf_adult', dailyRate: 0.001, cumulativeExpected: 0.01 },
    ],
  },
  breedingModel: {
    type: 'harem_based' as BreedingModelType,
    gestationDays: 23,
    breedingIntervalDays: 28,
    expectedOffspringPerEvent: 8,
    offspringVariance: 3,
    weaningAgeDays: 21,
    maturityAgeDays: 42,
    recommendedMaleToFemaleRatio: 0.33,
    breedingSuccessRate: 0.85,
    maxProductiveLifespanDays: 365,
  },
  forecastingConfig: {
    projectionWindowDays: 60,
    confidenceLevel: 0.85,
    mortalityInfluenceFactor: 1.0,
    growthAccelerationFactor: 1.0,
    breedingVariabilityFactor: 1.0,
    includeEnvironmentalFactors: false,
    minimumStockAlertThreshold: 10,
    projectionGranularity: 'weekly' as const,
  },
  thresholds: {
    overcrowdingThreshold: 0.90,
    mortalityWarningThreshold: 0.10,
    breedingInactivityDays: 45,
    growthDeviationAlertPercent: 25,
    maxAgeDaysBeforeRetirement: 365,
  },
  environmentalConfig: {
    optimalTemperature: { min: 20, max: 26 },
    criticalTemperature: { min: 15, max: 32 },
    optimalHumidity: { min: 40, max: 60 },
    lightCycleHours: { light: 12, dark: 12 },
    environmentalSensitivityRating: 5,
  },
} as const;
