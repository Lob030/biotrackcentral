/**
 * Daily Operational Intelligence
 * 
 * Public API for the Operational Command Center.
 * Transforms projections and statuses into actionable, prioritized alerts.
 */

// Types
export type {
  AttentionPriority,
  AttentionCategory,
  SuggestedAction,
  AttentionCard,
  OperationalHealthScore,
} from './runtime/types';

// Runtime Engine
export { priorityEngine, OperationalPriorityEngine } from './runtime/engine';

// UI Components
export { AttentionFeed } from './components/AttentionFeed';
export { ForecastWidget } from './components/ForecastWidgets';
export { ReadinessWidget } from './components/ReadinessWidgets';
export { OperationalCommandCenter } from './components/OperationalCommandCenter';
