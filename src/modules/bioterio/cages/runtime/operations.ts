/**
 * Bioterio Cage Runtime - Core Operations
 * 
 * Implements the fundamental cage-centric spatial operations for the bioterio.
 * This is the operational foundation for cage occupancy and lot movement workflows.
 * 
 * CRITICAL PRINCIPLES:
 * - Occupancy is DERIVED at runtime, not stored
 * - Movement history is IMMUTABLE (never overwritten)
 * - Lot/Cage relationships are tracked through assignments
 * - All movements preserve complete traceability
 */

import type {
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

// Import Lot types for integration
import type { Lot } from '../../lots/runtime/types';
import { getLotSummary } from '../../lots/runtime/operations';

/**
 * In-memory cage store (for demonstration/runtime purposes)
 * In production, this would be backed by a database
 */
class CageStore {
  private cages: Map<string, Cage> = new Map();
  private events: Map<string, CageLifecycleEvent[]> = new Map();
  private movements: Map<string, CageMovement[]> = new Map(); // Keyed by cageId
  private assignments: Map<string, LotAssignment[]> = new Map(); // Keyed by cageId
  
  // Reverse index: lotId -> cageId (for quick lookups)
  private lotToCage: Map<string, string> = new Map();

  save(cage: Cage): void {
    this.cages.set(cage.id, cage);
  }

  get(id: string): Cage | undefined {
    return this.cages.get(id);
  }

  getAll(): Cage[] {
    return Array.from(this.cages.values());
  }

  delete(id: string): boolean {
    return this.cages.delete(id);
  }

  addEvent(event: CageLifecycleEvent): void {
    const cageEvents = this.events.get(event.cageId) || [];
    cageEvents.push(event);
    this.events.set(event.cageId, cageEvents);
  }

  getEvents(cageId: string): CageLifecycleEvent[] {
    return this.events.get(cageId) || [];
  }

  addMovement(movement: CageMovement): void {
    // Record in destination cage
    const toMovements = this.movements.get(movement.toCageId) || [];
    toMovements.push(movement);
    this.movements.set(movement.toCageId, toMovements);
    
    // Also record in source cage if it's a transfer
    if (movement.fromCageId) {
      const fromMovements = this.movements.get(movement.fromCageId) || [];
      // Create a complementary "moved out" record
      const fromMovement: CageMovement = {
        ...movement,
        toCageId: movement.fromCageId,
        fromCageId: movement.toCageId,
        movementType: movement.movementType === 'initial_assignment' 
          ? 'removal' 
          : movement.movementType,
      };
      fromMovements.push(fromMovement);
      this.movements.set(movement.fromCageId, fromMovements);
    }
  }

  getMovements(cageId: string): CageMovement[] {
    return this.movements.get(cageId) || [];
  }

  addAssignment(cageId: string, assignment: LotAssignment): void {
    const cageAssignments = this.assignments.get(cageId) || [];
    cageAssignments.push(assignment);
    this.assignments.set(cageId, cageAssignments);
    
    // Update reverse index
    this.lotToCage.set(assignment.lotId, cageId);
  }

  removeAssignment(cageId: string, lotId: string): void {
    const cageAssignments = this.assignments.get(cageId) || [];
    const filtered = cageAssignments.filter(a => a.lotId !== lotId);
    this.assignments.set(cageId, filtered);
    
    // Remove from reverse index
    this.lotToCage.delete(lotId);
  }

  getAssignments(cageId: string): LotAssignment[] {
    return this.assignments.get(cageId) || [];
  }

  getCageForLot(lotId: string): string | undefined {
    return this.lotToCage.get(lotId);
  }

  getAllAssignments(): Map<string, LotAssignment[]> {
    return this.assignments;
  }
}

// Global store instance
const store = new CageStore();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a human-readable cage code
 * Format: [ROOM]-[RACK]-[POSITION]
 * Example: R1-A-01, R2-B-15
 */
function generateCageCode(roomId?: string, rackPosition?: string): string {
  const room = roomId || 'R1';
  const position = rackPosition || String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  return `${room}-${position}`;
}

/**
 * Create a new cage
 */
export function createCage(options: {
  roomId?: string;
  zoneId?: string;
  rackPosition?: string;
  capacity: CageCapacity;
  environment?: CageEnvironment;
  notes?: string;
  tags?: string[];
}): Cage {
  const now = new Date();
  const id = generateId();
  const code = generateCageCode(options.roomId, options.rackPosition);

  const cage: Cage = {
    id,
    code,
    roomId: options.roomId,
    zoneId: options.zoneId,
    rackPosition: options.rackPosition,
    capacity: options.capacity,
    environment: options.environment,
    status: 'available',
    createdAt: now,
    updatedAt: now,
    isActive: true,
    notes: options.notes,
    tags: options.tags,
  };

  store.save(cage);

  // Record creation event
  const event: CageLifecycleEvent = {
    id: generateId(),
    cageId: id,
    eventType: 'created',
    timestamp: now,
    metadata: {
      code,
      roomId: options.roomId,
      capacity: options.capacity,
    },
  };
  store.addEvent(event);

  return cage;
}

/**
 * Assign a lot to a cage
 * 
 * This is the PRIMARY workflow for placing lots into cages.
 * Creates an immutable movement record and updates occupancy derivation.
 */
export function assignLotToCage(options: AssignLotToCageOptions): {
  cage: Cage;
  assignment: LotAssignment;
  movement: CageMovement;
} {
  const cage = store.get(options.cageId);
  
  if (!cage) {
    throw new Error(`Cage not found: ${options.cageId}`);
  }

  if (cage.status === 'cleaning' || cage.status === 'maintenance') {
    throw new Error(`Cannot assign lot to cage with status '${cage.status}'`);
  }

  // Verify lot exists (basic check - full validation would query lot system)
  const lotSummary = getLotSummary(options.lotId);
  if (!lotSummary) {
    throw new Error(`Lot not found: ${options.lotId}`);
  }

  const now = new Date();

  // Check if lot is already assigned to another cage
  const existingCageId = store.getCageForLot(options.lotId);
  if (existingCageId && existingCageId !== options.cageId) {
    throw new Error(`Lot ${options.lotId} is already assigned to cage ${existingCageId}. Use moveLot() to relocate.`);
  }

  // Create assignment
  const assignment: LotAssignment = {
    lotId: options.lotId,
    assignedDate: now,
    quantityAtAssignment: options.quantity || lotSummary.currentQuantity,
    notes: options.notes,
  };

  store.addAssignment(options.cageId, assignment);

  // Create movement record
  const movement: CageMovement = {
    id: generateId(),
    lotId: options.lotId,
    toCageId: options.cageId,
    movementType: 'initial_assignment',
    timestamp: now,
    quantityMoved: options.quantity,
    performedBy: options.performedBy,
    notes: options.notes,
  };

  store.addMovement(movement);

  // Update cage status to occupied
  const oldStatus = cage.status;
  if (cage.status === 'available') {
    cage.status = 'occupied';
    cage.updatedAt = now;
    store.save(cage);
  }

  // Record lifecycle event
  const event: CageLifecycleEvent = {
    id: generateId(),
    cageId: options.cageId,
    eventType: 'lot_assigned',
    timestamp: now,
    lotId: options.lotId,
    previousStatus: oldStatus,
    newStatus: cage.status,
    reason: 'Lot assigned to cage',
    metadata: {
      assignmentId: assignment.lotId,
      quantity: assignment.quantityAtAssignment,
    },
  };
  store.addEvent(event);

  return { cage, assignment, movement };
}

/**
 * Move a lot from one cage to another
 * 
 * This is the CORE MOVEMENT workflow.
 * Preserves complete historical traceability through movement records.
 */
export function moveLot(options: MoveLotOptions): {
  fromCage: Cage;
  toCage: Cage;
  movement: CageMovement;
} {
  const fromCage = store.get(options.fromCageId);
  const toCage = store.get(options.toCageId);

  if (!fromCage) {
    throw new Error(`Source cage not found: ${options.fromCageId}`);
  }

  if (!toCage) {
    throw new Error(`Destination cage not found: ${options.toCageId}`);
  }

  if (toCage.status === 'cleaning' || toCage.status === 'maintenance' || toCage.status === 'quarantine') {
    throw new Error(`Cannot move lot to cage with status '${toCage.status}'`);
  }

  // Verify lot exists and is in source cage
  const lotSummary = getLotSummary(options.lotId);
  if (!lotSummary) {
    throw new Error(`Lot not found: ${options.lotId}`);
  }

  const currentCageId = store.getCageForLot(options.lotId);
  if (currentCageId !== options.fromCageId) {
    throw new Error(`Lot ${options.lotId} is not in cage ${options.fromCageId}. Currently in: ${currentCageId || 'none'}`);
  }

  const now = new Date();

  // Remove assignment from source cage
  store.removeAssignment(options.fromCageId, options.lotId);

  // Add assignment to destination cage
  const assignment: LotAssignment = {
    lotId: options.lotId,
    assignedDate: now,
    quantityAtAssignment: options.quantity || lotSummary.currentQuantity,
    notes: options.notes,
  };

  store.addAssignment(options.toCageId, assignment);

  // Create movement record
  const movement: CageMovement = {
    id: generateId(),
    lotId: options.lotId,
    fromCageId: options.fromCageId,
    toCageId: options.toCageId,
    movementType: 'transfer',
    timestamp: now,
    quantityMoved: options.quantity,
    reason: options.reason,
    performedBy: options.performedBy,
    notes: options.notes,
  };

  store.addMovement(movement);

  // Update cage statuses
  fromCage.updatedAt = now;
  toCage.updatedAt = now;

  // Recalculate source cage status
  const fromOccupancy = getCageOccupancy(options.fromCageId);
  if (fromOccupancy.totalLots === 0 && fromCage.status !== 'cleaning' && fromCage.status !== 'maintenance') {
    fromCage.status = 'available';
  }
  
  // Destination cage becomes occupied
  if (toCage.status === 'available') {
    toCage.status = 'occupied';
  }

  store.save(fromCage);
  store.save(toCage);

  // Record lifecycle events for both cages
  const fromEvent: CageLifecycleEvent = {
    id: generateId(),
    cageId: options.fromCageId,
    eventType: 'lot_moved_out',
    timestamp: now,
    lotId: options.lotId,
    reason: options.reason || 'Lot moved to another cage',
    metadata: {
      toCageId: options.toCageId,
      toCageCode: toCage.code,
    },
  };
  store.addEvent(fromEvent);

  const toEvent: CageLifecycleEvent = {
    id: generateId(),
    cageId: options.toCageId,
    eventType: 'lot_moved_in',
    timestamp: now,
    lotId: options.lotId,
    reason: options.reason || 'Lot moved from another cage',
    metadata: {
      fromCageId: options.fromCageId,
      fromCageCode: fromCage.code,
    },
  };
  store.addEvent(toEvent);

  return { fromCage, toCage, movement };
}

/**
 * Remove a lot from a cage
 * 
 * Used when a lot leaves the facility (sold, deceased, transferred out).
 */
export function removeLotFromCage(options: RemoveLotFromCageOptions): {
  cage: Cage;
  movement: CageMovement;
} {
  const cage = store.get(options.cageId);

  if (!cage) {
    throw new Error(`Cage not found: ${options.cageId}`);
  }

  // Verify lot is in this cage
  const currentCageId = store.getCageForLot(options.lotId);
  if (currentCageId !== options.cageId) {
    throw new Error(`Lot ${options.lotId} is not in cage ${options.cageId}. Currently in: ${currentCageId || 'none'}`);
  }

  const lotSummary = getLotSummary(options.lotId);
  const now = new Date();

  // Remove assignment
  store.removeAssignment(options.cageId, options.lotId);

  // Create movement record
  const movement: CageMovement = {
    id: generateId(),
    lotId: options.lotId,
    fromCageId: options.cageId,
    toCageId: options.cageId, // Same for removal (indicates exit)
    movementType: 'removal',
    timestamp: now,
    quantityMoved: lotSummary?.currentQuantity,
    reason: options.reason || 'Lot removed from cage',
    performedBy: options.performedBy,
    notes: options.notes,
  };

  store.addMovement(movement);

  // Update cage status if empty
  cage.updatedAt = now;
  const occupancy = getCageOccupancy(options.cageId);
  if (occupancy.totalLots === 0 && cage.status !== 'cleaning' && cage.status !== 'maintenance') {
    cage.status = 'available';
  }
  store.save(cage);

  // Record lifecycle event
  const event: CageLifecycleEvent = {
    id: generateId(),
    cageId: options.cageId,
    eventType: 'lot_removed',
    timestamp: now,
    lotId: options.lotId,
    reason: options.reason || 'Lot removed from facility',
    metadata: {
      movementType: 'removal',
    },
  };
  store.addEvent(event);

  return { cage, movement };
}

/**
 * Get derived cage occupancy
 * 
 * IMPORTANT: This is COMPUTED at runtime from:
 * - Active lot assignments
 * - Current lot quantities (fetched from lot system)
 * - Movement history
 * 
 * Occupancy is NOT stored on the cage itself.
 */
export function getCageOccupancy(cageId: string): CageOccupancy {
  const cage = store.get(cageId);
  
  if (!cage) {
    throw new Error(`Cage not found: ${cageId}`);
  }

  const assignments = store.getAssignments(cageId);
  const now = new Date();
  
  let totalAnimals = 0;
  const validAssignments: LotAssignment[] = [];

  for (const assignment of assignments) {
    // Fetch current lot data to get actual quantity
    const lotSummary = getLotSummary(assignment.lotId);
    
    if (lotSummary && lotSummary.status !== 'deceased' && lotSummary.status !== 'sold') {
      // Use current lot quantity, not the quantity at assignment
      const currentQty = lotSummary.currentQuantity;
      totalAnimals += currentQty;
      
      // Update assignment record with current quantity for accuracy
      validAssignments.push({
        ...assignment,
        quantityAtAssignment: currentQty,
      });
    }
  }

  const maxCapacity = cage.capacity.maxAnimals;
  const utilizationPercent = maxCapacity > 0 ? (totalAnimals / maxCapacity) * 100 : 0;
  const isOverCapacity = totalAnimals > maxCapacity;

  // Warn if over capacity
  if (isOverCapacity) {
    const existingAlerts = store.getEvents(cageId).filter(
      e => e.eventType === 'capacity_exceeded' && 
      e.timestamp > new Date(Date.now() - 3600000) // Last hour
    );
    
    if (existingAlerts.length === 0) {
      const alertEvent: CageLifecycleEvent = {
        id: generateId(),
        cageId,
        eventType: 'capacity_exceeded',
        timestamp: now,
        reason: `Cage has ${totalAnimals} animals but capacity is ${maxCapacity}`,
        metadata: {
          totalAnimals,
          maxCapacity,
          utilizationPercent,
        },
      };
      store.addEvent(alertEvent);
    }
  }

  return {
    cageId,
    totalAnimals,
    totalLots: validAssignments.length,
    assignments: validAssignments,
    utilizationPercent,
    isOverCapacity,
    lastUpdated: now,
  };
}

/**
 * Get all available cages (can accept new lots)
 */
export function getAvailableCages(filters?: {
  roomId?: string;
  speciesCompatible?: string;
  minCapacity?: number;
}): Cage[] {
  return store.getAll().filter(cage => {
    // Must be active and available
    if (!cage.isActive || cage.status === 'cleaning' || cage.status === 'maintenance' || cage.status === 'quarantine') {
      return false;
    }

    // Room filter
    if (filters?.roomId && cage.roomId !== filters.roomId) {
      return false;
    }

    // Species compatibility filter
    if (filters?.speciesCompatible && cage.capacity.speciesCompatibility) {
      if (!cage.capacity.speciesCompatibility.includes(filters.speciesCompatible)) {
        return false;
      }
    }

    // Minimum capacity filter
    if (filters?.minCapacity && cage.capacity.maxAnimals < filters.minCapacity) {
      return false;
    }

    return true;
  });
}

/**
 * Get lots currently in a cage
 */
export function getLotsInCage(cageId: string): { lotId: string; assignedDate: Date; quantity: number }[] {
  const assignments = store.getAssignments(cageId);
  
  return assignments.map(assignment => ({
    lotId: assignment.lotId,
    assignedDate: assignment.assignedDate,
    quantity: assignment.quantityAtAssignment,
  }));
}

/**
 * Get complete movement history for a cage
 */
export function getCageMovementHistory(cageId: string): MovementHistoryResult {
  const movements = store.getMovements(cageId);
  const currentAssignments = store.getAssignments(cageId);

  const totalMovementsIn = movements.filter(
    m => m.toCageId === cageId && m.movementType !== 'removal'
  ).length;

  const totalMovementsOut = movements.filter(
    m => m.fromCageId === cageId || m.movementType === 'removal'
  ).length;

  return {
    cageId,
    movements,
    totalMovementsIn,
    totalMovementsOut,
    currentAssignments,
  };
}

/**
 * Get cage lifecycle events
 */
export function getCageLifecycle(cageId: string): CageLifecycleEvent[] {
  return store.getEvents(cageId);
}

/**
 * Query cages with filters
 */
export function queryCages(filters: CageQueryFilters): Cage[] {
  return store.getAll().filter(cage => {
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(cage.status)) return false;
    }

    // Room filter
    if (filters.roomId && cage.roomId !== filters.roomId) {
      return false;
    }

    // Zone filter
    if (filters.zoneId && cage.zoneId !== filters.zoneId) {
      return false;
    }

    // Species compatibility filter
    if (filters.speciesCompatible && cage.capacity.speciesCompatibility) {
      if (!cage.capacity.speciesCompatibility.includes(filters.speciesCompatible)) {
        return false;
      }
    }

    // Active filter
    if (filters.includeInactive === false && !cage.isActive) {
      return false;
    }

    // Available only filter
    if (filters.availableOnly) {
      const occupancy = getCageOccupancy(cage.id);
      if (cage.status !== 'available' || occupancy.isOverCapacity) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Update cage status
 */
export function updateCageStatus(
  cageId: string, 
  newStatus: CageStatus, 
  reason?: string
): Cage | null {
  const cage = store.get(cageId);
  if (!cage) return null;

  const oldStatus = cage.status;
  cage.status = newStatus;
  cage.updatedAt = new Date();
  
  // Update timestamps for specific transitions
  const now = new Date();
  if (newStatus === 'cleaning' && oldStatus !== 'cleaning') {
    // Cleaning started - will set lastCleanedAt when completed
  }
  if (newStatus === 'available' && oldStatus === 'cleaning') {
    cage.lastCleanedAt = now;
  }
  if (newStatus === 'available' && oldStatus === 'maintenance') {
    cage.lastMaintenanceAt = now;
  }

  store.save(cage);

  // Record lifecycle event
  const event: CageLifecycleEvent = {
    id: generateId(),
    cageId,
    eventType: 'status_changed',
    timestamp: now,
    previousStatus: oldStatus,
    newStatus,
    reason: reason || `Status changed from ${oldStatus} to ${newStatus}`,
  };
  store.addEvent(event);

  return cage;
}

/**
 * Start cleaning process for a cage
 */
export function startCleaning(cageId: string, performedBy?: string): Cage | null {
  const cage = store.get(cageId);
  if (!cage) return null;

  if (cage.status === 'occupied') {
    throw new Error('Cannot clean occupied cage. Remove or relocate lots first.');
  }

  return updateCageStatus(cageId, 'cleaning', `Cleaning started by ${performedBy || 'system'}`);
}

/**
 * Complete cleaning process for a cage
 */
export function completeCleaning(cageId: string, performedBy?: string): Cage | null {
  const cage = store.get(cageId);
  if (!cage) return null;

  if (cage.status !== 'cleaning') {
    throw new Error('Cage is not in cleaning status');
  }

  const result = updateCageStatus(cageId, 'available', `Cleaning completed by ${performedBy || 'system'}`);
  
  if (result) {
    result.lastCleanedAt = new Date();
    store.save(result);
  }

  return result;
}

/**
 * Start maintenance for a cage
 */
export function startMaintenance(cageId: string, performedBy?: string): Cage | null {
  const cage = store.get(cageId);
  if (!cage) return null;

  if (cage.status === 'occupied') {
    throw new Error('Cannot maintain occupied cage. Remove or relocate lots first.');
  }

  return updateCageStatus(cageId, 'maintenance', `Maintenance started by ${performedBy || 'system'}`);
}

/**
 * Complete maintenance for a cage
 */
export function completeMaintenance(cageId: string, performedBy?: string): Cage | null {
  const cage = store.get(cageId);
  if (!cage) return null;

  if (cage.status !== 'maintenance') {
    throw new Error('Cage is not in maintenance status');
  }

  const result = updateCageStatus(cageId, 'available', `Maintenance completed by ${performedBy || 'system'}`);
  
  if (result) {
    result.lastMaintenanceAt = new Date();
    store.save(result);
  }

  return result;
}

/**
 * Get cage summary with derived occupancy
 */
export function getCageSummary(cageId: string): CageSummary | null {
  const cage = store.get(cageId);
  if (!cage) return null;

  const occupancy = getCageOccupancy(cageId);

  return {
    id: cage.id,
    code: cage.code,
    roomId: cage.roomId,
    status: cage.status,
    occupancy: {
      totalAnimals: occupancy.totalAnimals,
      totalLots: occupancy.totalLots,
      utilizationPercent: occupancy.utilizationPercent,
    },
    isActive: cage.isActive,
  };
}

/**
 * Get facility-wide occupancy statistics
 */
export function getFacilityStatistics(): {
  totalCages: number;
  activeCages: number;
  availableCages: number;
  occupiedCages: number;
  totalAnimals: number;
  totalLots: number;
  averageUtilization: number;
  overCapacityCages: number;
  byRoom: Record<string, { cages: number; animals: number; utilization: number }>;
} {
  const allCages = store.getAll().filter(c => c.isActive);
  const availableCagesList = allCages.filter(c => c.status === 'available');
  const occupiedCagesList = allCages.filter(c => c.status === 'occupied');

  let totalAnimals = 0;
  let totalLots = 0;
  let overCapacityCount = 0;
  const byRoom: Record<string, { cages: number; animals: number; utilization: number }> = {};

  for (const cage of allCages) {
    const occupancy = getCageOccupancy(cage.id);
    totalAnimals += occupancy.totalAnimals;
    totalLots += occupancy.totalLots;
    
    if (occupancy.isOverCapacity) {
      overCapacityCount++;
    }

    // Aggregate by room
    const roomId = cage.roomId || 'unassigned';
    if (!byRoom[roomId]) {
      byRoom[roomId] = { cages: 0, animals: 0, utilization: 0 };
    }
    byRoom[roomId].cages++;
    byRoom[roomId].animals += occupancy.totalAnimals;
  }

  // Calculate average utilization per room
  for (const roomId in byRoom) {
    const roomCages = allCages.filter(c => c.roomId === roomId);
    const maxCapacity = roomCages.reduce((sum, c) => sum + c.capacity.maxAnimals, 0);
    byRoom[roomId].utilization = maxCapacity > 0 
      ? (byRoom[roomId].animals / maxCapacity) * 100 
      : 0;
  }

  const totalCapacity = allCages.reduce((sum, c) => sum + c.capacity.maxAnimals, 0);
  const averageUtilization = totalCapacity > 0 ? (totalAnimals / totalCapacity) * 100 : 0;

  return {
    totalCages: allCages.length,
    activeCages: allCages.length,
    availableCages: availableCagesList.length,
    occupiedCages: occupiedCagesList.length,
    totalAnimals,
    totalLots,
    averageUtilization,
    overCapacityCages: overCapacityCount,
    byRoom,
  };
}

/**
 * Handle subdivision relocation workflow
 * 
 * When a lot is subdivided, child lots may need to be relocated.
 * This helper facilitates moving child lots to appropriate cages.
 */
export function relocateSubdividedLots(options: {
  parentLotId: string;
  childLotIds: string[];
  targetCageAssignments: Array<{ lotId: string; cageId: string; notes?: string }>;
  performedBy?: string;
}): Array<{ lotId: string; fromCageId?: string; toCageId: string; success: boolean; error?: string }> {
  const results: Array<{ lotId: string; fromCageId?: string; toCageId: string; success: boolean; error?: string }> = [];

  // Get current cage of parent lot (where children likely are)
  const parentCageId = store.getCageForLot(options.parentLotId);

  for (const assignment of options.targetCageAssignments) {
    try {
      const currentCageId = store.getCageForLot(assignment.lotId);
      
      if (currentCageId === assignment.cageId) {
        // Already in correct cage
        results.push({
          lotId: assignment.lotId,
          fromCageId: currentCageId || undefined,
          toCageId: assignment.cageId,
          success: true,
        });
        continue;
      }

      if (currentCageId) {
        // Move from current cage to target
        moveLot({
          lotId: assignment.lotId,
          fromCageId: currentCageId,
          toCageId: assignment.cageId,
          notes: assignment.notes || `Relocation after subdivision of ${options.parentLotId}`,
          performedBy: options.performedBy,
        });
      } else {
        // Initial assignment
        assignLotToCage({
          lotId: assignment.lotId,
          cageId: assignment.cageId,
          notes: assignment.notes || `Initial placement after subdivision of ${options.parentLotId}`,
          performedBy: options.performedBy,
        });
      }

      results.push({
        lotId: assignment.lotId,
        fromCageId: currentCageId || undefined,
        toCageId: assignment.cageId,
        success: true,
      });
    } catch (error) {
      results.push({
        lotId: assignment.lotId,
        fromCageId: parentCageId || undefined,
        toCageId: assignment.cageId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Export the store for testing/debugging
 */
export function _getCageStore(): CageStore {
  return store;
}
