/**
 * Operational Availability Engine — Public Index
 *
 * src/modules/bioterio/inventory/runtime/index.ts
 */

// Types
export type {
  InventorySnapshot,
  InventorySnapshotSummary,
  InventoryClassificationState,
  InventoryAvailabilityStatus,
  AvailabilityProjection,
  AvailabilityTimeline,
  ProjectedAvailability,
  AvailabilityWindow,
  InventoryReservation,
  CreateReservationInput,
  ReservationStatus,
  LowStockAlert,
  AvailabilityBottleneck,
  AvailabilityValidationResult,
  AvailabilityValidationIssue,
  InventoryMovementRecord,
  InventoryMovementType,
  LotForAvailability,
  SpeciesSettingsForProjection,
} from './types';

// Pure operations
export {
  getOperationalAvailability,
  buildInventorySnapshot,
  getProjectedAvailability,
  validateAvailability,
  classifyInventoryAvailability,
  calculateProjectedGrowth,
  getAvailabilityTimeline,
  queryAvailabilityForClassification,
  createReservation,
  releaseReservation,
  fulfillReservation,
  createMovementRecord,
  reconcileInventoryState,
} from './operations';

// React Query hooks
export {
  inventoryKeys,
  useInventorySnapshot,
  useAvailabilityProjection,
  useOperationalAvailability,
  useCreateReservation,
  useCancelReservation,
  useFulfillReservation,
} from './hooks';
