/**
 * Bioterio Validation Module Exports
 */

export {
  // End-to-end validation flows
  validateLotOperationalChain,
  validateCageOperationalChain,
  
  // Projection reconciliation
  rebuildProjectionFromEvents,
  
  // Integrity checks
  detectNegativeQuantities,
  detectInvalidSubdivisionTotals,
  detectOrphanMovementRecords,
  detectInvalidLineageReferences,
  
  // Debug tooling
  getOperationalTimeline,
  getWorkflowExecutionTrace,
  
  // Comprehensive validation
  runComprehensiveValidation,
  
  // Types
  type ValidationResult,
  type ValidationErrorDetail,
  type ValidationWarningDetail,
  type ReconciliationReport,
  type DiscrepancyDetail,
  type OperationalTimelineEntry,
  type WorkflowExecutionTrace,
  type WorkflowStepTrace,
} from './operational-integration';

import {
  validateLotOperationalChain,
  validateCageOperationalChain,
  rebuildProjectionFromEvents,
  detectNegativeQuantities,
  detectInvalidSubdivisionTotals,
  detectOrphanMovementRecords,
  detectInvalidLineageReferences,
  getOperationalTimeline,
  getWorkflowExecutionTrace,
  runComprehensiveValidation,
} from './operational-integration';

export const operationalValidation = {
  validateLotOperationalChain,
  validateCageOperationalChain,
  rebuildProjectionFromEvents,
  detectNegativeQuantities,
  detectInvalidSubdivisionTotals,
  detectOrphanMovementRecords,
  detectInvalidLineageReferences,
  getOperationalTimeline,
  getWorkflowExecutionTrace,
  runComprehensiveValidation,
};

export default operationalValidation;
