/**
 * Bioterio Lot Runtime - Core Operations
 * 
 * Implements the fundamental lot-centric operations for the bioterio.
 * This is the operational foundation that treats LOTS as the primary entity,
 * not individual animals.
 */

import type {
  Lot,
  LotStatus,
  LotSourceType,
  LotSexType,
  SpeciesId,
  LotLineage,
  LotSubdivision,
  LotLifecycleEvent,
  LotLifecycleEventType,
  CreateLotOptions,
  SubdivideLotOptions,
  LotQueryFilters,
  LotSummary,
} from './types';

/**
 * In-memory lot store (for demonstration/runtime purposes)
 * In production, this would be backed by a database
 */
class LotStore {
  private lots: Map<string, Lot> = new Map();
  private events: Map<string, LotLifecycleEvent[]> = new Map();

  save(lot: Lot): void {
    this.lots.set(lot.id, lot);
  }

  get(id: string): Lot | undefined {
    return this.lots.get(id);
  }

  getAll(): Lot[] {
    return Array.from(this.lots.values());
  }

  delete(id: string): boolean {
    return this.lots.delete(id);
  }

  addEvent(event: LotLifecycleEvent): void {
    const lotEvents = this.events.get(event.lotId) || [];
    lotEvents.push(event);
    this.events.set(event.lotId, lotEvents);
  }

  getEvents(lotId: string): LotLifecycleEvent[] {
    return this.events.get(lotId) || [];
  }
}

// Global store instance
const store = new LotStore();

/**
 * Generate a unique ID for lots and events
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a human-readable lot code
 * Format: [STRAIN_PREFIX]-[SEQUENCE]
 * Example: ASF-001, C57-042
 */
function generateLotCode(speciesId: SpeciesId, strain?: string): string {
  const prefix = strain ? strain.substring(0, 3).toUpperCase() : speciesId.substring(0, 3).toUpperCase();
  const sequence = Math.floor(Math.random() * 900) + 100; // 100-999
  return `${prefix}-${sequence}`;
}

/**
 * Create a new lot
 * 
 * This is the primary entry point for creating lots in the system.
 * Supports all source types: internal_birth, external_purchase, transfer
 */
export function createLot(options: CreateLotOptions): Lot {
  const now = new Date();
  const id = generateId();
  const code = generateLotCode(options.speciesId, options.strain);

  // Build lineage based on source type
  let lineage: LotLineage;
  
  if (options.originLotId) {
    // This lot came from a subdivision or transfer
    const originLot = store.get(options.originLotId);
    const ancestors = originLot 
      ? [...originLot.lineage.ancestors, options.originLotId]
      : [options.originLotId];
    
    lineage = {
      lotId: id,
      originLotId: options.originLotId,
      sourceType: options.sourceType,
      subdivisions: [],
      ancestors,
      generationDepth: ancestors.length,
    };
  } else {
    // This is a root lot (internal birth or external purchase)
    lineage = {
      lotId: id,
      sourceType: options.sourceType,
      subdivisions: [],
      ancestors: [],
      generationDepth: 0,
    };
  }

  const lot: Lot = {
    id,
    code,
    speciesId: options.speciesId,
    strain: options.strain,
    sex: options.sex,
    initialQuantity: options.quantity,
    currentQuantity: options.quantity,
    birthDate: options.birthDate,
    acquisitionDate: options.acquisitionDate,
    createdAt: now,
    updatedAt: now,
    sourceType: options.sourceType,
    originLotId: options.originLotId,
    supplierName: options.supplierName,
    status: 'active',
    location: options.location,
    lineage,
    notes: options.notes,
    tags: options.tags,
    sizeClassId: options.sizeClassId,
  };

  // Save the lot
  store.save(lot);

  // Record creation event
  const event: LotLifecycleEvent = {
    id: generateId(),
    lotId: id,
    eventType: 'created',
    timestamp: now,
    quantity: options.quantity,
    reason: `Lot created via ${options.sourceType}`,
    metadata: {
      speciesId: options.speciesId,
      sex: options.sex,
      strain: options.strain,
    },
  };
  store.addEvent(event);

  return lot;
}

/**
 * Subdivide a lot into multiple child lots
 * 
 * This is a CORE OPERATION in the lot-centric model.
 * When a lot is subdivided:
 * 1. The original lot's status changes to 'subdivided'
 * 2. New child lots are created with preserved lineage
 * 3. Quantity is distributed among child lots
 * 4. Historical traceability is maintained
 * 
 * Example:
 * Original: ASF-001 (mixed, 20 animals)
 * After subdivision:
 *   - ASF-001-M (male, 10 animals)
 *   - ASF-001-F (female, 10 animals)
 *   - ASF-001 status -> 'subdivided'
 */
export function subdivideLot(options: SubdivideLotOptions): {
  parentLot: Lot;
  childLots: Lot[];
} {
  const parentLot = store.get(options.lotId);
  
  if (!parentLot) {
    throw new Error(`Lot not found: ${options.lotId}`);
  }

  if (parentLot.status !== 'active') {
    throw new Error(`Cannot subdivide lot with status '${parentLot.status}'. Only active lots can be subdivided.`);
  }

  // Calculate total quantity to subdivide
  const totalSubdivided = options.subdivisions.reduce(
    (sum, sub) => sum + sub.quantity,
    0
  );

  if (totalSubdivided > parentLot.currentQuantity) {
    throw new Error(
      `Cannot subdivide ${totalSubdivided} animals from lot with only ${parentLot.currentQuantity} animals`
    );
  }

  const now = new Date();
  const childLots: Lot[] = [];

  // Create each child lot
  for (const subdivision of options.subdivisions) {
    const childId = generateId();
    const childCode = `${parentLot.code}${subdivision.codeSuffix || ''}`;

    // Build lineage - child inherits parent's ancestry plus parent
    const ancestors = [...parentLot.lineage.ancestors, parentLot.id];

    const childLineage: LotLineage = {
      lotId: childId,
      originLotId: parentLot.id,
      sourceType: 'transfer', // Subdivision is treated as internal transfer
      subdivisions: [],
      ancestors,
      generationDepth: ancestors.length,
    };

    const childLot: Lot = {
      id: childId,
      code: childCode,
      speciesId: parentLot.speciesId,
      strain: parentLot.strain,
      sex: subdivision.sex,
      initialQuantity: subdivision.quantity,
      currentQuantity: subdivision.quantity,
      birthDate: parentLot.birthDate,
      acquisitionDate: parentLot.acquisitionDate,
      createdAt: now,
      updatedAt: now,
      sourceType: 'transfer',
      originLotId: parentLot.id,
      status: 'active',
      location: parentLot.location,
      lineage: childLineage,
      notes: subdivision.notes,
      tags: parentLot.tags,
      sizeClassId: parentLot.sizeClassId,
      sizeClassName: parentLot.sizeClassName,
    };

    store.save(childLot);
    childLots.push(childLot);

    // Record subdivision event for child
    const childEvent: LotLifecycleEvent = {
      id: generateId(),
      lotId: childId,
      eventType: 'created',
      timestamp: now,
      quantity: subdivision.quantity,
      reason: `Created from subdivision of ${parentLot.code}`,
      metadata: {
        parentLotId: parentLot.id,
        parentLotCode: parentLot.code,
        sex: subdivision.sex,
      },
    };
    store.addEvent(childEvent);

    // Register subdivision relationship in parent's lineage
    const subdivisionRecord: LotSubdivision = {
      id: generateId(),
      parentLotId: parentLot.id,
      childLotId: childId,
      subdivisionDate: now,
      quantityAllocated: subdivision.quantity,
      sex: subdivision.sex,
      notes: subdivision.notes,
    };

    // Update parent's lineage with this subdivision
    parentLot.lineage.subdivisions.push(subdivisionRecord);
  }

  // Update parent lot status and quantity
  parentLot.status = 'subdivided';
  parentLot.currentQuantity -= totalSubdivided;
  parentLot.updatedAt = now;

  // If all animals were subdivided, mark as fully subdivided
  if (parentLot.currentQuantity === 0) {
    parentLot.status = 'subdivided';
  }

  store.save(parentLot);

  // Record subdivision event for parent
  const parentEvent: LotLifecycleEvent = {
    id: generateId(),
    lotId: parentLot.id,
    eventType: 'subdivided',
    timestamp: now,
    quantity: totalSubdivided,
    reason: `Subdivided into ${childLots.length} child lots`,
    metadata: {
      childLotIds: childLots.map((l) => l.id),
      childLotCodes: childLots.map((l) => l.code),
    },
  };
  store.addEvent(parentEvent);

  return {
    parentLot,
    childLots,
  };
}

/**
 * Get the complete lineage chain for a lot
 * Returns ancestors from oldest to most recent
 */
export function getLotLineage(lotId: string): LotLineage | null {
  const lot = store.get(lotId);
  if (!lot) return null;
  return lot.lineage;
}

/**
 * Get the full ancestry chain (all ancestor lots)
 */
export function getLotAncestors(lotId: string): Lot[] {
  const lot = store.get(lotId);
  if (!lot) return [];

  const ancestors: Lot[] = [];
  let currentOriginId = lot.lineage.originLotId;

  while (currentOriginId) {
    const ancestor = store.get(currentOriginId);
    if (!ancestor) break;
    ancestors.push(ancestor);
    currentOriginId = ancestor.lineage.originLotId;
  }

  // Reverse to get oldest first
  return ancestors.reverse();
}

/**
 * Get all descendant lots (children, grandchildren, etc.)
 */
export function getLotDescendants(lotId: string): Lot[] {
  const lot = store.get(lotId);
  if (!lot) return [];

  const descendants: Lot[] = [];
  const toVisit = [lotId];

  while (toVisit.length > 0) {
    const currentId = toVisit.pop()!;
    const currentLot = store.get(currentId);
    if (!currentLot) continue;

    // Find direct children
    for (const allLot of store.getAll()) {
      if (allLot.lineage.originLotId === currentId) {
        descendants.push(allLot);
        toVisit.push(allLot.id);
      }
    }
  }

  return descendants;
}

/**
 * Get the complete lifecycle history for a lot
 */
export function getLotLifecycle(lotId: string): LotLifecycleEvent[] {
  return store.getEvents(lotId);
}

/**
 * Get all active lots (not subdivided, sold, retired, or deceased)
 */
export function getActiveLots(): Lot[] {
  return store.getAll().filter((lot) => lot.status === 'active');
}

/**
 * Get lots matching specific filters
 */
export function queryLots(filters: LotQueryFilters): Lot[] {
  return store.getAll().filter((lot) => {
    // Status filter
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      if (!statuses.includes(lot.status)) return false;
    }

    // Species ID filter
    if (filters.speciesId) {
      const speciesIds = Array.isArray(filters.speciesId) ? filters.speciesId : [filters.speciesId];
      if (!speciesIds.includes(lot.speciesId)) return false;
    }

    // Sex filter
    if (filters.sex) {
      const sexes = Array.isArray(filters.sex) ? filters.sex : [filters.sex];
      if (!sexes.includes(lot.sex)) return false;
    }

    // Source type filter
    if (filters.sourceType && lot.sourceType !== filters.sourceType) {
      return false;
    }

    // Include subdivided filter
    if (filters.includeSubdivided === false && lot.status === 'subdivided') {
      return false;
    }

    return true;
  });
}

/**
 * Update lot status
 */
export function updateLotStatus(lotId: string, newStatus: LotStatus, reason?: string): Lot | null {
  const lot = store.get(lotId);
  if (!lot) return null;

  const oldStatus = lot.status;
  lot.status = newStatus;
  lot.updatedAt = new Date();
  store.save(lot);

  // Record status change event
  const event: LotLifecycleEvent = {
    id: generateId(),
    lotId,
    eventType: 'status_changed',
    timestamp: new Date(),
    reason: reason || `Status changed from ${oldStatus} to ${newStatus}`,
    metadata: {
      oldStatus,
      newStatus,
    },
  };
  store.addEvent(event);

  return lot;
}

/**
 * Add animals to a lot (e.g., from breeding, transfer in)
 */
export function addAnimalsToLot(lotId: string, quantity: number, reason?: string): Lot | null {
  const lot = store.get(lotId);
  if (!lot) return null;

  if (lot.status !== 'active') {
    throw new Error(`Cannot add animals to lot with status '${lot.status}'`);
  }

  lot.currentQuantity += quantity;
  lot.updatedAt = new Date();
  store.save(lot);

  // Record event
  const event: LotLifecycleEvent = {
    id: generateId(),
    lotId,
    eventType: 'animals_added',
    timestamp: new Date(),
    quantity,
    reason: reason || 'Animals added to lot',
  };
  store.addEvent(event);

  return lot;
}

/**
 * Remove animals from a lot (e.g., mortality, transfer out)
 */
export function removeAnimalsFromLot(
  lotId: string,
  quantity: number,
  reason?: string,
  isMortality: boolean = false
): Lot | null {
  const lot = store.get(lotId);
  if (!lot) return null;

  if (lot.status !== 'active') {
    throw new Error(`Cannot remove animals from lot with status '${lot.status}'`);
  }

  if (quantity > lot.currentQuantity) {
    throw new Error(`Cannot remove ${quantity} animals from lot with only ${lot.currentQuantity} animals`);
  }

  lot.currentQuantity -= quantity;
  lot.updatedAt = new Date();

  // Auto-mark as deceased if all animals are gone due to mortality
  if (isMortality && lot.currentQuantity === 0) {
    lot.status = 'deceased';
  }

  store.save(lot);

  // Record event
  const event: LotLifecycleEvent = {
    id: generateId(),
    lotId,
    eventType: isMortality ? 'mortality' : 'animals_removed',
    timestamp: new Date(),
    quantity,
    reason: reason || (isMortality ? 'Mortality event' : 'Animals removed from lot'),
  };
  store.addEvent(event);

  return lot;
}

/**
 * Get lot summary (lightweight representation)
 */
export function getLotSummary(lotId: string): LotSummary | null {
  const lot = store.get(lotId);
  if (!lot) return null;

  return {
    id: lot.id,
    code: lot.code,
    speciesId: lot.speciesId,
    sex: lot.sex,
    currentQuantity: lot.currentQuantity,
    status: lot.status,
    location: lot.location,
    sizeClassId: lot.sizeClassId,
    sizeClassName: lot.sizeClassName,
  };
}

/**
 * Get statistics about the lot population
 */
export function getLotStatistics(): {
  totalLots: number;
  activeLots: number;
  totalAnimals: number;
  bySpeciesId: Record<string, number>;
  byStatus: Record<string, number>;
} {
  const allLots = store.getAll();
  const activeLots = allLots.filter((l) => l.status === 'active');

  const bySpeciesId: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const lot of allLots) {
    bySpeciesId[lot.speciesId] = (bySpeciesId[lot.speciesId] || 0) + lot.currentQuantity;
    byStatus[lot.status] = (byStatus[lot.status] || 0) + 1;
  }

  return {
    totalLots: allLots.length,
    activeLots: activeLots.length,
    totalAnimals: activeLots.reduce((sum, l) => sum + l.currentQuantity, 0),
    bySpeciesId,
    byStatus,
  };
}

/**
 * Export the store for testing/debugging
 */
export function _getStore(): LotStore {
  return store;
}

/**
 * Get a single lot by ID (convenience wrapper over the store).
 */
export function getLotById(id: string): Lot | undefined {
  return store.getLot(id);
}

/**
 * Register mortality for a lot.
 * Semantic alias for removeAnimalsFromLot with isMortality=true.
 */
export function registerMortality(options: {
  lotId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}): { lot: Lot } {
  const lot = removeAnimalsFromLot(options.lotId, options.quantity, options.reason || options.notes, true);
  if (!lot) throw new Error(`Lot not found: ${options.lotId}`);
  return { lot };
}
