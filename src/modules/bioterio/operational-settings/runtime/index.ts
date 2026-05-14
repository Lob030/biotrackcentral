/**
 * Operational Settings Runtime
 * 
 * Public API for the Bioterio Operational Settings Runtime layer.
 * 
 * This module is consumed by:
 * - Dashboard widgets (alerts, projections, forecasting)
 * - AI Runtime (growth, mortality, breeding, thresholds)
 * - Availability Engine (inventory projections)
 * - Workflow Validation (capability-driven decisions)
 */

// Types
export type {
  OperationalSettingsProfile,
  GrowthModel,
  GrowthModelType,
  MortalityModel,
  MortalityModelType,
  BreedingModel,
  BreedingModelType,
  ClassificationProgressionModel,
  ClassificationStage,
  ForecastingConfiguration,
  OperationalThresholds,
  EnvironmentalConfiguration,
  OperationalAlertRule,
  AlertSeverity,
  AlertCategory,
  GrowthProjectionResult,
  AvailabilityProjectionResult,
  BreedingOutputProjectionResult,
  MortalityProjectionResult,
  ClassificationProgressionEstimate,
} from './types';

// Starter defaults
export { ASF_OPERATIONAL_DEFAULTS } from './types';

// Operations
export {
  getOperationalSettings,
  getWorkspaceOperationalSettings,
  saveOperationalSettings,
  deleteOperationalSettings,
  updateGrowthModel,
  updateMortalityModel,
  updateBreedingModel,
  updateThresholds,
  updateAlertRules,
} from './operations';

// Projection utilities
export {
  projectGrowth,
  projectAvailability,
  projectBreedingOutput,
  projectMortality,
  estimateClassificationProgression,
} from './operations';
