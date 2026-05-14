/**
 * Operational Settings Runtime Operations
 * 
 * This module provides:
 * - CRUD operations for OperationalSettingsProfile
 * - Projection utilities consumed by dashboards, AI, and alerts
 * 
 * ARCHITECTURE:
 *   projectGrowth()                    → Growth forecasting engine
 *   projectAvailability()              → Availability forecasting engine
 *   projectBreedingOutput()            → Reproduction projection engine
 *   projectMortality()                 → Mortality projection engine
 *   estimateClassificationProgression() → Stage transition estimator
 * 
 * All projections are:
 *   - Species-agnostic (use OperationalQuantityUnit from capability profile)
 *   - Workspace-scoped
 *   - Confidence-rated
 */

import type {
  OperationalSettingsProfile,
  GrowthModel,
  MortalityModel,
  BreedingModel,
  ClassificationProgressionModel,
  ForecastingConfiguration,
  OperationalThresholds,
  EnvironmentalConfiguration,
  OperationalAlertRule,
  GrowthProjectionResult,
  AvailabilityProjectionResult,
  BreedingOutputProjectionResult,
  MortalityProjectionResult,
  ClassificationProgressionEstimate,
  ASF_OPERATIONAL_DEFAULTS,
} from './types';

import type { OperationalQuantityUnit } from '../../species/runtime/types';

// ============================================================================
// IN-MEMORY STORE
// ============================================================================

interface OperationalSettingsStore {
  profiles: Map<string, OperationalSettingsProfile>;
  getBySpecies(workspaceId: string, speciesProfileId: string): OperationalSettingsProfile | undefined;
  save(profile: OperationalSettingsProfile): void;
  delete(id: string): void;
}

function createStore(): OperationalSettingsStore {
  const profiles = new Map<string, OperationalSettingsProfile>();

  return {
    profiles,
    getBySpecies(workspaceId: string, speciesProfileId: string) {
      for (const profile of profiles.values()) {
        if (profile.workspaceId === workspaceId && profile.speciesProfileId === speciesProfileId) {
          return profile;
        }
      }
      return undefined;
    },
    save(profile: OperationalSettingsProfile) {
      profiles.set(profile.id, profile);
    },
    delete(id: string) {
      profiles.delete(id);
    },
  };
}

const store = createStore();

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

let _idCounter = 0;
function generateId(): string {
  return `ops_${Date.now()}_${++_idCounter}`;
}

/**
 * Get operational settings for a species runtime instance within a workspace.
 */
export function getOperationalSettings(
  workspaceId: string,
  speciesProfileId: string
): OperationalSettingsProfile | undefined {
  return store.getBySpecies(workspaceId, speciesProfileId);
}

/**
 * Get all operational settings profiles for a workspace.
 */
export function getWorkspaceOperationalSettings(
  workspaceId: string
): OperationalSettingsProfile[] {
  return Array.from(store.profiles.values()).filter(
    (p) => p.workspaceId === workspaceId
  );
}

/**
 * Save or update an operational settings profile.
 */
export function saveOperationalSettings(
  profile: OperationalSettingsProfile
): OperationalSettingsProfile {
  profile.updatedAt = new Date();
  store.save(profile);
  return profile;
}

/**
 * Delete an operational settings profile.
 */
export function deleteOperationalSettings(id: string): boolean {
  store.delete(id);
  return true;
}

/**
 * Update a specific sub-model within an operational settings profile.
 */
export function updateGrowthModel(
  profileId: string,
  growthModel: Partial<GrowthModel>
): OperationalSettingsProfile | null {
  const profile = store.profiles.get(profileId);
  if (!profile) return null;
  profile.growthModel = { ...profile.growthModel, ...growthModel, updatedAt: new Date() };
  profile.updatedAt = new Date();
  store.save(profile);
  return profile;
}

export function updateMortalityModel(
  profileId: string,
  mortalityModel: Partial<MortalityModel>
): OperationalSettingsProfile | null {
  const profile = store.profiles.get(profileId);
  if (!profile) return null;
  profile.mortalityModel = { ...profile.mortalityModel, ...mortalityModel, updatedAt: new Date() };
  profile.updatedAt = new Date();
  store.save(profile);
  return profile;
}

export function updateBreedingModel(
  profileId: string,
  breedingModel: Partial<BreedingModel>
): OperationalSettingsProfile | null {
  const profile = store.profiles.get(profileId);
  if (!profile) return null;
  profile.breedingModel = { ...profile.breedingModel, ...breedingModel, updatedAt: new Date() };
  profile.updatedAt = new Date();
  store.save(profile);
  return profile;
}

export function updateThresholds(
  profileId: string,
  thresholds: Partial<OperationalThresholds>
): OperationalSettingsProfile | null {
  const profile = store.profiles.get(profileId);
  if (!profile) return null;
  profile.thresholds = { ...profile.thresholds, ...thresholds, updatedAt: new Date() };
  profile.updatedAt = new Date();
  store.save(profile);
  return profile;
}

export function updateAlertRules(
  profileId: string,
  alertRules: OperationalAlertRule[]
): OperationalSettingsProfile | null {
  const profile = store.profiles.get(profileId);
  if (!profile) return null;
  profile.alertRules = alertRules;
  profile.updatedAt = new Date();
  store.save(profile);
  return profile;
}

// ============================================================================
// PROJECTION UTILITIES
// ============================================================================

/**
 * Project growth trajectory for a lot or population.
 * 
 * Consumed by: dashboards, AI recommendations, availability forecasting.
 * 
 * @param currentWeight   Current weight/measurement (in species' quantity unit)
 * @param currentAgeDays  Current age in days
 * @param growthModel     The species' growth model configuration
 * @param forecastConfig  Forecasting configuration
 */
export function projectGrowth(
  currentWeight: number,
  currentAgeDays: number,
  growthModel: GrowthModel,
  forecastConfig: ForecastingConfiguration
): GrowthProjectionResult {
  const now = new Date();
  const points: GrowthProjectionResult['points'] = [];
  const windowDays = forecastConfig.projectionWindowDays;
  const granularityDays = getGranularityDays(forecastConfig.projectionGranularity);

  for (let day = 0; day <= windowDays; day += granularityDays) {
    const futureDate = addDays(now, day);
    const futureAge = currentAgeDays + day;
    let projectedWeight = currentWeight;
    let projectedSizeClassId: string | undefined;
    let projectedSizeClassName: string | undefined;
    let confidence = forecastConfig.confidenceLevel;

    switch (growthModel.type) {
      case 'linear_growth': {
        const rate = (growthModel.dailyGrowthRate ?? 0) * forecastConfig.growthAccelerationFactor;
        projectedWeight = currentWeight + rate * day;
        break;
      }
      case 'staged_growth': {
        if (growthModel.stageProgression) {
          let accumulatedDays = 0;
          for (const stage of growthModel.stageProgression) {
            const stageEnd = accumulatedDays + (stage.expectedDurationDays ?? 9999);
            if (futureAge >= accumulatedDays && futureAge < stageEnd) {
              projectedSizeClassId = stage.sizeClassId;
              // Interpolate weight within stage
              const stageProgress = stage.expectedDurationDays
                ? (futureAge - accumulatedDays) / stage.expectedDurationDays
                : 0;
              const entry = stage.expectedEntryWeight ?? currentWeight;
              const exit = stage.expectedExitWeight ?? entry;
              projectedWeight = entry + (exit - entry) * stageProgress;
              break;
            }
            accumulatedDays = stageEnd;
          }
        }
        break;
      }
      case 'curve_growth': {
        if (growthModel.curveParams) {
          const { asymptote, inflectionDay, steepness } = growthModel.curveParams;
          // Sigmoid growth curve: W(t) = L / (1 + e^(-k*(t - t0)))
          projectedWeight = asymptote / (1 + Math.exp(-steepness * (futureAge - inflectionDay)));
        }
        break;
      }
      case 'colony_expansion': {
        if (growthModel.doublingTimeDays) {
          // Exponential colony growth
          projectedWeight = currentWeight * Math.pow(2, day / growthModel.doublingTimeDays);
        }
        break;
      }
      case 'production_cycle': {
        // Cyclical — weight/production stays constant, output varies by cycle phase
        projectedWeight = currentWeight;
        break;
      }
    }

    // Confidence decays over time
    confidence = Math.max(0.1, forecastConfig.confidenceLevel * (1 - day / (windowDays * 2)));

    points.push({
      date: futureDate,
      projectedWeight,
      projectedSizeClassId,
      projectedSizeClassName,
      confidence,
    });
  }

  return {
    speciesProfileId: growthModel.speciesProfileId,
    projectedAt: now,
    points,
  };
}

/**
 * Project future availability by classification stage.
 * 
 * Consumed by: availability dashboard, sales forecasting, AI optimizer.
 * 
 * @param currentInventory  Current stock per size class
 * @param settings          Full operational settings profile
 * @param quantityUnit      The species' operational quantity unit
 */
export function projectAvailability(
  currentInventory: { sizeClassId: string; sizeClassName: string; quantity: number }[],
  settings: OperationalSettingsProfile,
  quantityUnit: OperationalQuantityUnit
): AvailabilityProjectionResult {
  const now = new Date();
  const projections: AvailabilityProjectionResult['projections'] = [];
  const windowDays = settings.forecastingConfig.projectionWindowDays;
  const granularityDays = getGranularityDays(settings.forecastingConfig.projectionGranularity);

  for (let day = 0; day <= windowDays; day += granularityDays) {
    const futureDate = addDays(now, day);

    for (const item of currentInventory) {
      // Apply mortality losses
      let mortalityRate = 0;
      if (settings.mortalityModel.type === 'fixed_rate') {
        mortalityRate = settings.mortalityModel.dailyMortalityRate ?? 0;
      } else if (settings.mortalityModel.type === 'stage_based' && settings.mortalityModel.stageMortalityRates) {
        const stageRate = settings.mortalityModel.stageMortalityRates.find(
          (s) => s.sizeClassId === item.sizeClassId
        );
        mortalityRate = stageRate?.dailyRate ?? 0;
      }

      const mortalityFactor = settings.forecastingConfig.mortalityInfluenceFactor;
      const projectedLoss = item.quantity * mortalityRate * day * mortalityFactor;
      const projectedQuantity = Math.max(0, item.quantity - projectedLoss);

      // Confidence decays
      const confidence = Math.max(
        0.1,
        settings.forecastingConfig.confidenceLevel * (1 - day / (windowDays * 2))
      );

      projections.push({
        date: futureDate,
        sizeClassId: item.sizeClassId,
        sizeClassName: item.sizeClassName,
        projectedQuantity,
        quantityUnit,
        confidence,
      });
    }
  }

  return {
    speciesProfileId: settings.speciesProfileId,
    projectedAt: now,
    projections,
  };
}

/**
 * Project expected breeding output over the forecast window.
 * 
 * Consumed by: reproduction dashboard, production planning, AI optimizer.
 * 
 * @param activeBreedingGroups  Number of active breeding groups/pairs
 * @param settings              Full operational settings profile
 * @param quantityUnit          The species' operational quantity unit
 */
export function projectBreedingOutput(
  activeBreedingGroups: number,
  settings: OperationalSettingsProfile,
  quantityUnit: OperationalQuantityUnit
): BreedingOutputProjectionResult {
  const now = new Date();
  const events: BreedingOutputProjectionResult['events'] = [];
  const breedingModel = settings.breedingModel;
  const windowDays = settings.forecastingConfig.projectionWindowDays;
  let totalProjectedOffspring = 0;

  const intervalDays = breedingModel.breedingIntervalDays;
  const successRate = breedingModel.breedingSuccessRate ?? 1.0;
  const expectedPerEvent = breedingModel.expectedOffspringPerEvent;
  const variabilityFactor = settings.forecastingConfig.breedingVariabilityFactor;

  // Project breeding events across the window
  for (let day = intervalDays; day <= windowDays; day += intervalDays) {
    const expectedDate = addDays(now, day);
    const expectedOffspring = Math.round(
      activeBreedingGroups *
      expectedPerEvent *
      successRate *
      variabilityFactor
    );

    const confidence = Math.max(
      0.1,
      settings.forecastingConfig.confidenceLevel * (1 - day / (windowDays * 1.5))
    );

    events.push({
      expectedDate,
      expectedOffspring,
      quantityUnit,
      confidence,
    });

    totalProjectedOffspring += expectedOffspring;
  }

  return {
    speciesProfileId: settings.speciesProfileId,
    projectedAt: now,
    events,
    totalProjectedOffspring,
  };
}

/**
 * Project mortality over the forecast window.
 * 
 * Consumed by: mortality dashboard, risk assessment, AI alerts.
 * 
 * @param currentQuantity  Current total population/stock
 * @param settings         Full operational settings profile
 * @param quantityUnit     The species' operational quantity unit
 */
export function projectMortality(
  currentQuantity: number,
  settings: OperationalSettingsProfile,
  quantityUnit: OperationalQuantityUnit
): MortalityProjectionResult {
  const now = new Date();
  const points: MortalityProjectionResult['points'] = [];
  const windowDays = settings.forecastingConfig.projectionWindowDays;
  const granularityDays = getGranularityDays(settings.forecastingConfig.projectionGranularity);
  const mortalityFactor = settings.forecastingConfig.mortalityInfluenceFactor;

  let cumulativeLosses = 0;
  let remaining = currentQuantity;

  for (let day = 0; day <= windowDays; day += granularityDays) {
    const futureDate = addDays(now, day);
    let dailyRate = 0;

    if (settings.mortalityModel.type === 'fixed_rate') {
      dailyRate = settings.mortalityModel.dailyMortalityRate ?? 0;
    } else if (settings.mortalityModel.type === 'colony_decay') {
      dailyRate = settings.mortalityModel.colonyDecayRate ?? 0;
    } else if (settings.mortalityModel.type === 'stage_based') {
      // Use average across all stages for aggregate projection
      const rates = settings.mortalityModel.stageMortalityRates ?? [];
      dailyRate = rates.length > 0
        ? rates.reduce((sum, r) => sum + r.dailyRate, 0) / rates.length
        : 0;
    }

    const periodLosses = remaining * dailyRate * granularityDays * mortalityFactor;
    cumulativeLosses += periodLosses;
    remaining = Math.max(0, currentQuantity - cumulativeLosses);

    const confidence = Math.max(
      0.1,
      settings.forecastingConfig.confidenceLevel * (1 - day / (windowDays * 2))
    );

    points.push({
      date: futureDate,
      projectedLosses: periodLosses,
      quantityUnit,
      cumulativeLosses,
      remainingQuantity: remaining,
      confidence,
    });
  }

  return {
    speciesProfileId: settings.speciesProfileId,
    projectedAt: now,
    points,
  };
}

/**
 * Estimate when a lot will progress through classification stages.
 * 
 * Consumed by: lot detail views, availability forecasting, AI optimizer.
 * 
 * @param lotId            Lot identifier
 * @param currentAgeDays   Current age of lot in days
 * @param currentSizeClassId  Current size classification
 * @param progression      Classification progression model
 * @param forecastConfig   Forecasting configuration
 */
export function estimateClassificationProgression(
  lotId: string,
  currentAgeDays: number,
  currentSizeClassId: string,
  progression: ClassificationProgressionModel,
  forecastConfig: ForecastingConfiguration
): ClassificationProgressionEstimate {
  const now = new Date();
  const projectedProgressions: ClassificationProgressionEstimate['projectedProgressions'] = [];

  // Find current stage index
  const currentStageIndex = progression.stages.findIndex(
    (s) => s.sizeClassId === currentSizeClassId
  );

  if (currentStageIndex === -1) {
    return {
      speciesProfileId: progression.speciesProfileId,
      lotId,
      currentSizeClassId,
      projectedProgressions: [],
    };
  }

  let accumulatedDays = currentAgeDays;

  // Project future stage transitions
  for (let i = currentStageIndex + 1; i < progression.stages.length; i++) {
    const stage = progression.stages[i];
    const previousStage = progression.stages[i - 1];

    let daysUntilTransition: number;

    switch (progression.transitionMethod) {
      case 'age_based':
        daysUntilTransition = (stage.minAgeDays ?? accumulatedDays) - accumulatedDays;
        break;
      case 'weight_based':
      case 'hybrid':
        daysUntilTransition = previousStage.expectedDurationDays ?? 7;
        break;
      case 'manual':
        daysUntilTransition = previousStage.expectedDurationDays ?? 14;
        break;
      default:
        daysUntilTransition = 7;
    }

    daysUntilTransition = Math.max(0, daysUntilTransition);
    accumulatedDays += daysUntilTransition;

    const estimatedDate = addDays(now, accumulatedDays - currentAgeDays);
    const daysFuture = accumulatedDays - currentAgeDays;
    const confidence = Math.max(
      0.1,
      forecastConfig.confidenceLevel * (1 - daysFuture / (forecastConfig.projectionWindowDays * 2))
    );

    projectedProgressions.push({
      toSizeClassId: stage.sizeClassId,
      toSizeClassName: '', // To be filled by caller with display name
      estimatedDate,
      confidence,
    });

    if (stage.isTerminal) break;
  }

  return {
    speciesProfileId: progression.speciesProfileId,
    lotId,
    currentSizeClassId,
    projectedProgressions,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getGranularityDays(granularity: ForecastingConfiguration['projectionGranularity']): number {
  switch (granularity) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'biweekly': return 14;
    case 'monthly': return 30;
    default: return 7;
  }
}

/**
 * Export the store for testing/debugging.
 */
export function _getOperationalSettingsStore(): OperationalSettingsStore {
  return store;
}
