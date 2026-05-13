/**
 * Bioterio Cage Runtime - Public API
 * 
 * Exports all cage runtime types and operations for external use.
 */

// Types
export type {
  Cage,
  CageStatus,
  CageCapacity,
  CageEnvironment,
  CageLifecycleEvent,
  CageLifecycleEventType,
  CageMovement,
  LotAssignment,
  CageOccupancy,
  AssignLotToCageOptions,
  MoveLotOptions,
  RemoveLotFromCageOptions,
  CageQueryFilters,
  CageSummary,
  MovementHistoryResult,
} from './types';

// Operations
export {
  createCage,
  assignLotToCage,
  moveLot,
  removeLotFromCage,
  getCageOccupancy,
  getAvailableCages,
  getLotsInCage,
  getCageMovementHistory,
  getCageLifecycle,
  queryCages,
  updateCageStatus,
  startCleaning,
  completeCleaning,
  startMaintenance,
  completeMaintenance,
  getCageSummary,
  getFacilityStatistics,
  relocateSubdividedLots,
  _getCageStore,
} from './operations';
