/**
 * Bioterio Persistence Module Export
 * 
 * Central export for all persistence-related functionality.
 */

export * from './types';
export * from './services';

import {
  persistOperationalEvent,
  queryOperationalEvents,
  persistLot,
  persistLotEvent,
  getLotLifecycleEvents,
  persistCage,
  persistCageMovement,
  persistLotAssignment,
  persistBreedingGroup,
  persistLitter,
  rebuildLotStateProjection,
  rebuildCageOccupancyProjection,
  rebuildAllProjections,
  generateDashboardSnapshot,
} from './services';

export const persistenceServices = {
  persistOperationalEvent,
  queryOperationalEvents,
  persistLot,
  persistLotEvent,
  getLotLifecycleEvents,
  persistCage,
  persistCageMovement,
  persistLotAssignment,
  persistBreedingGroup,
  persistLitter,
  rebuildLotStateProjection,
  rebuildCageOccupancyProjection,
  rebuildAllProjections,
  generateDashboardSnapshot,
};

export default persistenceServices;
