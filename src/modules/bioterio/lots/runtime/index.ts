/**
 * Bioterio Lot Runtime - Public API
 * 
 * Re-exports all types and operations for the lot-centric runtime system.
 * This is the main entry point for consuming the lot runtime.
 */

// Types
export type {
  Lot,
  LotStatus,
  LotSourceType,
  LotSexType,
  LotSpecies,
  LotLineage,
  LotSubdivision,
  LotLifecycleEvent,
  LotLifecycleEventType,
  CreateLotOptions,
  SubdivideLotOptions,
  LotQueryFilters,
  LotSummary,
} from './types';

// Operations
export {
  createLot,
  subdivideLot,
  getLotLineage,
  getLotAncestors,
  getLotDescendants,
  getLotLifecycle,
  getActiveLots,
  queryLots,
  updateLotStatus,
  addAnimalsToLot,
  removeAnimalsFromLot,
  getLotSummary,
  getLotStatistics,
  _getStore,
} from './operations';
